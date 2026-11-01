import { general } from "#/shared/database/general-db";
import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import dayjs from "dayjs";
import { createEvent } from "../server/events/events.model";
import type { Kysely, Transaction } from "kysely";
import { normalizeIp } from "#/helpers/normalize-ip";
import type { DB } from "@gen/db/general";
import { authLogger } from "./auth.model";
import { logger } from "@repo/shared/utils/logger";
import type * as z from "zod";
import { isProduction } from "#/shared/env";
import type { registerSchema } from "@repo/shared/schemas/auth";
import { skinsService } from "../../shared/services/skins";
import { invariant } from "#/utils";
import { minioService } from "#/shared/services/minio";

type RegisterUser = Omit<CreateUser, "findoutType" | "findout" | "uuid"> & {
	trx?: Transaction<DB>;
};

const registerLogger = authLogger.child({ name: "register" });

type CreateUser = Omit<z.infer<typeof registerSchema>, "token"> & {
	uuid: string;
	ip: string;
};

type RegisterParams = {
	referrer: string;
	referral: string;
	trx: Transaction<DB>;
};

const referral = {
	async register({ referrer, referral, trx }: RegisterParams) {
		const isExist = await trx
			.selectFrom("players")
			.select("nickname")
			.where("nickname", "=", referrer)
			.executeTakeFirst();

		if (!isExist?.nickname) {
			logger.child({ name: "referals" }).warn(`Referrer ${referrer} is not defined as player`);
			return;
		}

		const isValidByLimitReferrer = await trx
			.selectFrom("referrals")
			.select("id")
			.where("referrer", "=", referrer)
			.execute();

		if (isValidByLimitReferrer.length >= 4) {
			logger.child({ name: "referals" }).warn(`Referals limit by referrer`);
			return;
		}

		const query = await trx
			.insertInto("referrals")
			.values({
				referrer,
				referral,
			})
			.executeTakeFirstOrThrow();

		logger.child({ name: "referals" }).info(`Registered new referal ${referral} of ${referrer}`);

		return query;
	},
};

const MAX_USERS_PER_IP = 3;

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
				const val = await cb();
				invariant(val, `${key} for ${nickname} error inited`);
				return { val, key };
			}),
		);

		registerLogger.debug({ eventsExec, nickname });
	},
	async create(args: RegisterUser): Promise<{ nickname: string; created_at: Date }> {
		const { trx, ip, nickname, password, hash } = args;
		const dbInstance: Kysely<DB> | Transaction<DB> = trx ?? general;

    const uuid = this.generateOfflineUUID(nickname);

		const base = {
			uuid,
			regDateMs: Date.now(),
			lowerCaseNickname: nickname.toLowerCase(),
		};

		registerLogger.info(`Starting register player ${nickname}`);

		type Instance = Kysely<DB> | Transaction<DB>;

		async function registerAccount(instance: Instance) {
			return instance
				.insertInto("accounts")
				.values({
					uuid: base.uuid,
					nickname,
					lower_nickname: base.lowerCaseNickname,
				})
				.returning(["id"])
				.executeTakeFirstOrThrow();
		}

		async function registerCredentials(instance: Instance, accountId: number) {
			return instance
				.insertInto("account_credentials")
				.values({
					account_id: accountId,
					password_hash: password,
				})
				.executeTakeFirstOrThrow();
		}

		// Legacy LimboAuth table: dual-written until the plugin is removed.
		async function registerAUTH(instance: Instance) {
			return instance
				.insertInto("AUTH")
				.values({
					NICKNAME: nickname,
					LOWERCASENICKNAME: base.lowerCaseNickname,
					IP: normalizeIp(ip),
					HASH: password,
					UUID: base.uuid,
					REGDATE: base.regDateMs,
				})
				.onConflict((oc) => oc.column("LOWERCASENICKNAME").doNothing())
				.returning(["NICKNAME", "REGDATE"])
				.executeTakeFirstOrThrow();
		}

		async function registerPlayers(instance: Instance) {
			return instance
				.insertInto("players")
				.values({
					nickname,
					lower_case_nickname: base.lowerCaseNickname,
					uuid: base.uuid,
				})
				.returning(["nickname", "created_at"])
				.executeTakeFirstOrThrow();
		}

		try {
			async function register(instance: Instance) {
				const account = await registerAccount(instance);

				const [players] = await Promise.all([
					registerPlayers(instance),
					registerAUTH(instance),
					registerCredentials(instance, account.id),
				]);

				return players;
			}

			const result = dbInstance.isTransaction
				? await register(dbInstance)
				: await dbInstance.transaction().execute(register);

			if (isProduction) {
				await this.registrationEvents({ nickname, uuid });
			}

			if (isProduction) {
				this.afterRegistrationEvents({ nickname });
			}

			return {
				nickname: result.nickname,
				created_at: result.created_at,
			};
		} catch (e) {
			registerLogger.error(e);
			throw e;
		}
	},
	async createUser(args: Omit<CreateUser, "uuid">): Promise<{ nickname: string; created_at: Date }> {
		const { nickname, findout, password, ip, findoutType, hash } = args;

		return await general.transaction().execute(async (trx) => {
			const registeredUser = await this.create({
				trx,
				hash,
				nickname,
				password,
				ip,
			});

			const REFERRAL_EVENTS = {
				referrer: async () => {
					const result = await referral.register({
						trx,
						referral: nickname,
						referrer: findout,
					});
					console.log(result);
				},
				custom: async () => {
          const val = await trx
            .insertInto("findout")
            .values({ nickname, value: findout })
            .executeTakeFirstOrThrow();

          console.log(val);
				},
			};

			const referralEvent = REFERRAL_EVENTS[findoutType];
			await referralEvent();

			return {
				nickname: registeredUser.nickname,
				created_at: registeredUser.created_at,
			};
		});
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
	},
	async validateIpRestricts(ip: string): Promise<boolean> {
    const result = await general
      .selectFrom("AUTH")
      .select("NICKNAME")
      .where("IP", "=", ip)
      .execute();

		// Anti multi-account heuristic for web registration: three accounts per IP,
		// the fourth is refused.
		return result.length >= MAX_USERS_PER_IP;
	},
	async unregister({
		nickname,
		isStrict = false,
	}: {
		nickname: string;
		isStrict?: boolean;
	}): Promise<{ nickname: string }> {
		const localLogger = authLogger.child({ name: "unregister" });
		localLogger.info(`Starting unregistering player ${nickname}. Strict: ${isStrict}`);

		const result = await general.transaction().execute(async (trx) => {
			const auth = await trx
				.deleteFrom("AUTH")
				.where("LOWERCASENICKNAME", "=", nickname.toLowerCase())
				.executeTakeFirstOrThrow();

			if (!auth.numDeletedRows) {
				invariant(isStrict, "Error for deleting from auth");
			}

			// Canonical row first: account_credentials cascades from it.
			await trx
				.deleteFrom("accounts")
				.where("lower_nickname", "=", nickname.toLowerCase())
				.executeTakeFirst();

			localLogger.info(`Player ${nickname} from auth and accounts`);

			if (isStrict) {
        const players = await trx
          .deleteFrom("players")
          .where("nickname", "=", nickname)
          .executeTakeFirstOrThrow();

				invariant(players.numDeletedRows, "Error for deleting from players");
				localLogger.info(`Player ${nickname} from players`);
			}

			return { nickname };
		});

		return result;
	},
};
