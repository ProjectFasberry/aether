import { normalizeIp } from "#/helpers/normalize-ip";
import { client } from "#/shared/api/client";
import { general } from "#/shared/database/general-db";
import { getRedis } from "#/shared/redis/init";
import { logger } from "#/utils/config/logger";
import { safeJsonParse } from "#/utils/config/transforms";
import { textSets } from "#/utils/minio/load-internal-files";
import type { registerSchema } from "@repo/shared/schemas/auth";
import type { DB } from "@repo/shared/types/db/general-database-types";
import dayjs from "dayjs";
import type { Kysely, Transaction } from "kysely";
import type z from "zod";
import { createEvent } from "../server/events/events.model";
import { getNats } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import { initPlayerSkin } from "../server/skin/skin.model";
import { invariant } from "#/helpers/invariant";
import type { Context } from "elysia";
import { SESSION_KEY, setCookie } from "#/utils/auth/cookie";
import { isProduction } from "#/shared/env";

export const DEFAULT_SESSION_EXPIRE = 60 * 60 * 24 * 30; // 30 days
export const DEFAULT_SESSION_EXPIRE_MS = 60 * 60 * 24 * 30 * 1000;

export const MIN_SESSION_EXPIRE = 60 * 60 * 24 * 15; // 15 days
export const MIN_SESSION_EXPIRE_MS = 60 * 60 * 24 * 15 * 1000;

export const USER_SESSIONS_LIMIT = 15; // 15 sessions per user

export const getUserSessionsKey = (nickname: string) => `user_sessions:${nickname}`;
export const getUserKey = (token: string) => `session:${token}`;

export async function getExistsUser(
	nickname: string,
): Promise<{ result: false; hash: null } | { result: true; hash: string }> {
	const query = await general.selectFrom("AUTH").select("HASH").where("NICKNAME", "=", nickname).executeTakeFirst();

	if (!query) return { hash: null, result: false };

	return { hash: query.HASH, result: true };
}

export type UserSessionPayload = {
	nickname: string;
	browser: string;
	ip: string;
	os: string;
	platform: string;
	created_at: string | Date;
};

export async function getUserNickname(token: string): Promise<string | null> {
	const redis = getRedis();

	const data = await redis.get(getUserKey(token));
	if (!data) return null;

	const result = safeJsonParse<UserSessionPayload>(data);
	if (!result.ok) return null;

	return result.value.nickname ?? null;
}

export async function getIsExistsSession(token: string) {
	const result = await getUserNickname(token);
	return Boolean(result);
}

export async function refreshSession(token: string) {
	const redis = getRedis();
	const sessionKey = getUserKey(token);
	const remainingTtlMs = await redis.pttl(sessionKey);

	if (remainingTtlMs < 0) {
		return null;
	}

	if (remainingTtlMs < MIN_SESSION_EXPIRE_MS) {
		const nickname = await redis.get(sessionKey);

		if (!nickname) {
			return null;
		}

		const userSessionsKey = getUserSessionsKey(nickname);
		const newExpiresAtTimestamp = Date.now() + DEFAULT_SESSION_EXPIRE_MS;

		const pipeline = redis.multi();

		pipeline.pexpireat(sessionKey, newExpiresAtTimestamp);
		pipeline.pexpireat(userSessionsKey, newExpiresAtTimestamp);

		await pipeline.exec();

		return {
			result: true,
			nickname,
			expires_at: new Date(newExpiresAtTimestamp),
		};
	}

	return null;
}

//#region
type CreateUser = Omit<z.infer<typeof registerSchema>, "token"> & {
	uuid: string;
	ip: string;
};

async function registerReferrer({
	referrer,
	referral,
	trx,
}: {
	referrer: string;
	referral: string;
	trx: Transaction<DB>;
}) {
	const isExist = await trx
		.selectFrom("players")
		.select("nickname")
		.where("nickname", "=", referrer)
		.executeTakeFirst();

	if (!isExist?.nickname) {
		logger.withTag("Referals").warn(`Referrer ${referrer} is not defined as player`);
		return;
	}

	const isValidByLimitReferrer = await trx
		.selectFrom("referrals")
		.select("id")
		.where("referrer", "=", referrer)
		.execute();

	if (isValidByLimitReferrer.length >= 4) {
		logger.withTag("Referals").warn(`Referals limit by referrer`);
		return;
	}

	const query = await trx
		.insertInto("referrals")
		.values({
			referrer,
			referral,
		})
		.executeTakeFirstOrThrow();

	logger.withTag("Referals").log(`Registered new referal ${referral} of ${referrer}`);

	return query;
}

export const authLogger = logger.withTag("Auth");

export async function unregisterUser({
	nickname,
	strict = false,
}: {
	nickname: string;
	strict?: boolean;
}): Promise<{ nickname: string }> {
	const localLogger = authLogger.withTag("Unregister");
	localLogger.log(`Starting unregistering player ${nickname}. Strict: ${strict}`);

	const result = await general.transaction().execute(async (trx) => {
		const auth = await trx
			.deleteFrom("AUTH")
			.where("LOWERCASENICKNAME", "=", nickname.toLowerCase())
			.executeTakeFirstOrThrow();

		if (!auth.numDeletedRows) {
			invariant(strict, "Error for deleting from auth");
		}

		localLogger.log(`Player ${nickname} from auth`);

		if (strict) {
			const players = await trx.deleteFrom("players").where("nickname", "=", nickname).executeTakeFirstOrThrow();

			invariant(players.numDeletedRows, "Error for deleting from players");

			localLogger.log(`Player ${nickname} from players`);
		}

		return { nickname };
	});

	return result;
}

type RegisterUser = Omit<CreateUser, "findoutType" | "findout" | "uuid"> & {
	trx?: Transaction<DB>;
};

const registerLogger = authLogger.withTag("Register");

export async function registrationEvents({ nickname }: { nickname: string }) {
	if (!isProduction) {
		console.warn("Skipping registrationEvents on development");
		return;
	}

	const eventsRec = {
		skin: initPlayerSkin,
	};

	const events = Object.entries(eventsRec);

	const eventsExec = await Promise.all(
		events.map(async ([key, fn]) => {
			const val = await fn(nickname);
			invariant(val, `${key} for ${nickname} error inited`);

			registerLogger.log(`${key} for ${nickname} inited`);

			return { val, key };
		}),
	);

	registerLogger.log(eventsExec, nickname);
}

export async function registerUser({
	trx,
	ip,
	nickname,
	password,
	mnHex
}: RegisterUser): Promise<{ nickname: string; created_at: Date }> {
	const dbInstance: Kysely<DB> = trx ?? general;
	
	const uuid = await getUserUUID(nickname);
	const regDateMs = Date.now();
	const lowerCaseNickname = nickname.toLowerCase();

	registerLogger.log(`Starting register player ${nickname}`);

	async function registerAUTH(instance: Kysely<DB>) {
		return instance
			.insertInto("AUTH")
			.values({
				NICKNAME: nickname,
				LOWERCASENICKNAME: lowerCaseNickname,
				IP: normalizeIp(ip),
				HASH: password,
				UUID: uuid,
				REGDATE: regDateMs,
			})
			.onConflict((oc) => oc.column("LOWERCASENICKNAME").doNothing())
			.returning(["NICKNAME", "REGDATE"])
			.executeTakeFirstOrThrow();
	}

	async function registerPlayers(instance: Kysely<DB>) {
		return instance
			.insertInto("players")
			.values({
				nickname,
				lower_case_nickname: lowerCaseNickname,
				uuid,
			})
			.returning(["nickname", "created_at"])
			.executeTakeFirstOrThrow();
	}

	try {
		async function register() {
			if (dbInstance.isTransaction) {
				const [players, _] = await Promise.all([registerPlayers(dbInstance), registerAUTH(dbInstance)]);

				await registrationEvents({ nickname });

				return players;
			} else {
				const result = await dbInstance.transaction().execute(async (trx) => {
					const [players, _] = await Promise.all([registerPlayers(dbInstance), registerAUTH(dbInstance)]);

					return players;
				});

				await registrationEvents({ nickname });

				return result;
			}
		}

		const result = await register();

		const formattedDate = dayjs(result.created_at).format("DD.HH.MM hh:mm:ss");
		registerLogger.log(`Player ${nickname} in ${formattedDate}`);

		afterRegistrationEvents({ nickname });

		return result;
	} catch (e) {
		throw e;
	}
}

const MAX_USERS_PER_IP = 3;

export async function validateIpRestricts(ip: string): Promise<boolean> {
	const result = await general.selectFrom("AUTH").select("NICKNAME").where("IP", "=", ip).execute();

	if (!result) return false;

	return result.length > MAX_USERS_PER_IP;
}

function afterRegistrationEvents({ nickname }: { nickname: string }) {
	createEvent({
		description: `Игрок ${nickname} был зарегистрирован`,
		type: "log",
		initiator: "system",
		title: "Регистрация",
	});

	const nc = getNats();

	nc.publish(
		SUBJECTS.EVENTS.AUTHORIZATION.REGISTER,
		JSON.stringify({
			created_at: dayjs().toDate(),
			nickname,
		}),
	);
}

export async function createUser({
	nickname,
	findout,
	password,
	ip,
	findoutType,
	mnHex
}: Omit<CreateUser, "uuid">): Promise<{ nickname: string }> {
	const result = await general.transaction().execute(async (trx) => {
		const registeredUser = await registerUser({ trx, mnHex, nickname, password, ip });

		if (findoutType === "referrer") {
			const referrer = findout;
			const referral = nickname;

			await registerReferrer({ trx, referral, referrer });
		} else if (findoutType === "custom") {
			await trx.insertInto("findout").values({ nickname, value: findout }).executeTakeFirstOrThrow();
		}

		return registeredUser;
	});

	return result;
}

export function generateOfflineUUID(nickname: string): string {
	const offlineIdentifier = `OfflinePlayer:${nickname}`;

	const hashBuffer = new Bun.CryptoHasher("md5").update(offlineIdentifier).digest();

	const hashArray = new Uint8Array(hashBuffer);

	hashArray[6] = (hashArray[6] & 0x0f) | 0x30;
	hashArray[8] = (hashArray[8] & 0x3f) | 0x80;

	const uuid = Array.from(hashArray)
		.map((byte) => ("00" + byte.toString(16)).slice(-2))
		.join("");

	const raw = [uuid.slice(0, 8), uuid.slice(8, 12), uuid.slice(12, 16), uuid.slice(16, 20), uuid.slice(20)];

	return raw.join("-");
}

const MOJANG_API_URL = "https://api.ashcon.app/mojang/v2/user";

type MojangPayload = { uuid: string } | { reason: string; error: string };

async function getLicense(nickname: string) {
	const result = await client
		.get(`${MOJANG_API_URL}/${nickname}`, { throwHttpErrors: false, timeout: 5000 })
		.json<MojangPayload>();

	return result;
}
//#endregion

export function validatePasswordSafe(pwd: string): boolean {
	const unsafePasswords = textSets["unsafe_passwords.txt"];
	return !unsafePasswords.has(pwd.trim());
}

export async function getUserUUID(nickname: string) {
	let uuid: string | null = null;
	let type: "offline" | "license" = "license";

	try {
		const license = await getLicense(nickname);

		if ("error" in license) {
			type = "offline";
			throw new Error(license.reason);
		}

		if (license.uuid) {
			uuid = license.uuid;
		}
	} catch (e) {
		// generate offline uuid if user is not licensed
		uuid = generateOfflineUUID(nickname);
	}

	authLogger.log(`Player ${nickname} has a ${type} account`);

	invariant(uuid, "UUID must be required");

	return uuid;
}

export async function updateSession(token: string | undefined, cookie: Context["cookie"]) {
	if (!token) return;

	const refreshResult = await refreshSession(token);

	if (refreshResult) {
		const { expires_at, nickname } = refreshResult;

		setCookie({
			cookie,
			key: SESSION_KEY,
			expires: expires_at,
			value: token,
		});
	}
}
