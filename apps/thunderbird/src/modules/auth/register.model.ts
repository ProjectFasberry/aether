import { general } from "#/shared/database/general-db";
import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import dayjs from "dayjs";
import { createEvent } from "../server/events/events.model";
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@gen/db/general";
import { authLogger } from "./auth.model";
import { logger } from "@repo/shared/utils/logger";
import type * as z from "zod";
import { isProduction } from "#/shared/env";
import type { registerSchema } from "@repo/shared/schemas/auth";
import { skinsService } from "../../shared/services/skins";
import { minioService } from "#/shared/services/minio";
import { ensurePlayerProfiles } from "./register-profiles";

type RegisterUser = Omit<CreateUser, "findout" | "uuid"> & {
	trx?: Transaction<DB>;
};

const registerLogger = authLogger.child({ name: "register" });

type CreateUser = Omit<z.infer<typeof registerSchema>, "token"> & {
	uuid: string;
	ip: string;
};

/** Offline-mode UUID (md5 of `OfflinePlayer:<nickname>`) used by the game. */
export function offlineUuid(nickname: string): string {
	const offlineIdentifier = `OfflinePlayer:${nickname}`;

	const hashBuff = new Bun.CryptoHasher("md5").update(offlineIdentifier).digest();
	const hashArr = new Uint8Array(hashBuff);

	hashArr[6] = (hashArr[6] & 0x0f) | 0x30;
	hashArr[8] = (hashArr[8] & 0x3f) | 0x80;

	const uuid = Array.from(hashArr)
		.map((byte) => ("00" + byte.toString(16)).slice(-2))
		.join("");

	const raw = [uuid.slice(0, 8), uuid.slice(8, 12), uuid.slice(12, 16), uuid.slice(16, 20), uuid.slice(20)];

	return raw.join("-");
}

type AccountRows = { nickname: string; created_at: Date; uuid: string };

/** Canonical account rows in `general`: account, player and credentials. */
export async function createAccountRows(
	instance: Kysely<DB> | Transaction<DB>,
	{ nickname, password }: { nickname: string; password: string },
): Promise<AccountRows> {
	const uuid = offlineUuid(nickname);
	const lowerCaseNickname = nickname.toLowerCase();

	const account = await instance
		.insertInto("accounts")
		.values({ uuid, nickname, lower_nickname: lowerCaseNickname })
		.returning(["id"])
		.executeTakeFirstOrThrow();

	const [player] = await Promise.all([
		instance
			.insertInto("players")
			.values({ nickname, lower_case_nickname: lowerCaseNickname, uuid })
			.returning(["nickname", "created_at"])
			.executeTakeFirstOrThrow(),
		instance
			.insertInto("account_credentials")
			.values({ account_id: account.id, password_hash: password })
			.executeTakeFirstOrThrow(),
	]);

	return { nickname: player.nickname, created_at: player.created_at, uuid };
}

export const register = {
  async registrationEvents({ nickname, uuid }: { nickname: string, uuid: string }) {
		const REGISTRATION_EVENTS = {
			skin: () =>
				skinsService.skin.initSkin({
					nickname,
          minio: minioService.getInstance,
          uuid
				}),
		};

		const eventsExec = await Promise.all(
			Object.entries(REGISTRATION_EVENTS).map(async ([key, cb]) => {
				try {
					const val = await cb();
					return { val, key };
				} catch (e) {
					// The account is already committed. A secondary initializer must
					// not turn a successful registration into a 500.
					registerLogger.error({ message: `${key} init failed for ${nickname}`, error: e });
					return { val: false, key };
				}
			}),
		);

		registerLogger.debug({ eventsExec, nickname });
	},
	async create(args: RegisterUser): Promise<{ nickname: string; created_at: Date }> {
		const { trx, nickname, password } = args;
		const dbInstance: Kysely<DB> | Transaction<DB> = trx ?? general;

		registerLogger.info(`Starting register player ${nickname}`);

		try {
			const result = dbInstance.isTransaction
				? await createAccountRows(dbInstance, { nickname, password })
				: await dbInstance.transaction().execute((transaction) =>
						createAccountRows(transaction, { nickname, password }),
					);

			this.runPostRegistrationEffects({ nickname, uuid: result.uuid });

			return {
				nickname: result.nickname,
				created_at: result.created_at,
			};
		} catch (e) {
			registerLogger.error(e);
			throw e;
		}
	},
	/**
	 * Reserves the account without credentials: an invite link lets the player
	 * set the password later. No REGISTER event until the password is accepted.
	 */
	async createPending({ nickname }: { nickname: string }): Promise<{ nickname: string; uuid: string }> {
		const uuid = offlineUuid(nickname);
		const lowerCaseNickname = nickname.toLowerCase();

		registerLogger.info(`Reserving account for invite ${nickname}`);

		await general.transaction().execute(async (trx) => {
			await trx
				.insertInto("accounts")
				.values({ uuid, nickname, lower_nickname: lowerCaseNickname })
				.executeTakeFirstOrThrow();

			await trx
				.insertInto("players")
				.values({ nickname, lower_case_nickname: lowerCaseNickname, uuid })
				.executeTakeFirstOrThrow();
		});

		// Profiles and skins are safe before the password exists: the account is
		// reserved and the player row already has the default role.
		void ensurePlayerProfiles({ nickname, uuid }).catch((error) => {
			registerLogger.error({ message: `player profiles failed for ${nickname}`, error });
		});

		if (isProduction) {
			void this.registrationEvents({ nickname, uuid }).catch((error) => {
				registerLogger.error({ message: `registration events failed for ${nickname}`, error });
			});
		}

		return { nickname, uuid };
	},
	/** Best-effort side effects that must never fail a committed registration. */
	runPostRegistrationEffects({ nickname, uuid }: { nickname: string; uuid: string }) {
		// Plugin databases are separate engines and may be down; the account is
		// already committed, so rows are created best-effort and the function is
		// idempotent for later backfills.
		void ensurePlayerProfiles({ nickname, uuid }).catch((error) => {
			registerLogger.error({ message: `player profiles failed for ${nickname}`, error });
		});

		if (isProduction) {
			// Best-effort after commit: skins DB or MinIO downtime must not delay
			// or fail an already successful registration.
			void this.registrationEvents({ nickname, uuid }).catch((error) => {
				registerLogger.error({ message: `registration events failed for ${nickname}`, error });
			});

			this.afterRegistrationEvents({ nickname });
		}
	},
	async createUser(args: Omit<CreateUser, "uuid">): Promise<{ nickname: string; created_at: Date }> {
		const { nickname, findout, password } = args;

		const result = await general.transaction().execute(async (trx) => {
			const rows = await createAccountRows(trx, { nickname, password });

			await trx
				.insertInto("findout")
				.values({ nickname, value: findout })
				.executeTakeFirstOrThrow();

			registerLogger.debug({ nickname, findout });

			return rows;
		});

		this.runPostRegistrationEffects({ nickname, uuid: result.uuid });

		return {
			nickname: result.nickname,
			created_at: result.created_at,
		};
	},
	afterRegistrationEvents({ nickname }: { nickname: string }) {
		createEvent({
			description: `Игрок ${nickname} был зарегистрирован`,
			type: "log",
			initiator: "system",
			title: "Регистрация",
		});

		const nc = natsService.getInstance();

		nc.publish(
			SUBJECTS.EVENTS.AUTHORIZATION.REGISTER,
			JSON.stringify({
				created_at: dayjs().toDate(),
				nickname,
			}),
		);
	},
	generateOfflineUUID(nickname: string): string {
		return offlineUuid(nickname);
	},
};
