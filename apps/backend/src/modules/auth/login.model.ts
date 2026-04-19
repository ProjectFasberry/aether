import { isProduction } from "#/shared/env";
import { getNats } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import dayjs from "dayjs";
import { authLogger, auth } from "./auth.model";
import { invariant } from "@repo/shared/lib/utils";
import Bowser from "bowser";
import { getRedis } from "#/shared/redis/init";
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import { nanoid } from "nanoid";
import type { QREventsEvent, QRGeneratePayload } from "@repo/shared/schemas/auth/login";
import type { Nullable } from "kysely";
import type { Context } from "elysia";
import { SESSION_KEY, setCookie } from "#/utils/auth/cookie";

type CreateSession = {
	nickname: string;
	userAgentStr?: string;
	ip: string;
};

type CreateSessionPayload = {
	expires_at: Date;
	token: string
}

export type UserSessionPayload = {
	nickname: string;
	browser: string;
	ip: string;
	os: string;
	platform: string;
	created_at: string | Date;
};

export const DEFAULT_SESSION_EXPIRE = 60 * 60 * 24 * 30; // 30 days
export const DEFAULT_SESSION_EXPIRE_MS = 60 * 60 * 24 * 30 * 1000;
export const MIN_SESSION_EXPIRE = 60 * 60 * 24 * 15; // 15 days
export const MIN_SESSION_EXPIRE_MS = 60 * 60 * 24 * 15 * 1000;
export const USER_SESSIONS_LIMIT = 15; // 15 sessions per user

export const loginLogger = authLogger.withTag("Login");
export const qrLogger = loginLogger.withTag("QR");

const IP_WHITELIST = ["127.0.0.1", "::1", "localhost"] as const;

export const session = {
	getUserSessionsKey: (nickname: string) => `user_sessions:${nickname}`,
	async refreshSession(token: string) {
		const redis = getRedis();
		const sessionKey = auth.getUserKey(token);
		const remainingTtlMs = await redis.pttl(sessionKey);

		if (remainingTtlMs < 0) {
			return null;
		}

		if (remainingTtlMs < MIN_SESSION_EXPIRE_MS) {
			const nickname = await redis.get(sessionKey);

			if (!nickname) {
				return null;
			}

			const userSessionsKey = this.getUserSessionsKey(nickname);
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
	},
	async getIsExistsSession(token: string) {
		const result = await auth.getUserNickname(token);
		return Boolean(result);
	},
	async updateSession(token: string | undefined, cookie: Context["cookie"]) {
		if (!token) return;

		const refreshResult = await this.refreshSession(token);

		if (refreshResult) {
			const { expires_at, nickname } = refreshResult;

			setCookie({
				cookie,
				key: SESSION_KEY,
				expires: expires_at,
				value: token,
			});
		}
	},
	generateSessionToken(): string {
		const bytes = new Uint8Array(20);
		crypto.getRandomValues(bytes);
		return encodeBase32LowerCaseNoPadding(bytes);
	},
	async afterLoginEvents({ nickname }: { nickname: string }) {
		const nc = getNats();

		const payload = {
			created_at: dayjs().toDate(),
			nickname,
		}

		nc.publish(
			SUBJECTS.EVENTS.AUTHORIZATION.LOGIN, JSON.stringify(payload)
		);
	},
	async create({ userAgentStr, ip, nickname }: CreateSession): Promise<CreateSessionPayload> {
		const redis = getRedis();

		const token = this.generateSessionToken();
		const ua = Bowser.parse(userAgentStr ?? "");

		const userSessionsKey = this.getUserSessionsKey(nickname);
		const newSessionKey = auth.getUserKey(token);

		const createUserSessionsPp = redis
			.multi()
			.zcard(userSessionsKey)

		const createUserSessionsResults = await createUserSessionsPp.exec();
		invariant(createUserSessionsResults, "Transaction failed and returned null");

		const [[err, res]] = createUserSessionsResults;
		if (err) throw err

		const currSessionsCount = res as number;

		if (currSessionsCount >= USER_SESSIONS_LIMIT) {
			const oldestSessions = await redis.zrange(userSessionsKey, 0, 0);

			if (oldestSessions.length > 0) {
				const oldestToken = oldestSessions[0];
				const userSessionKey = auth.getUserKey(token);

				const removalPipeline = redis
					.multi()
					.zrem(userSessionsKey, oldestToken)
					.del(userSessionKey)

				const removalResults = await removalPipeline.exec();
				console.log("removalResults", removalResults)
			}
		}

		type IterateKey = "platform" | "os" | "browser" | "ip";

		const { browser, engine, os, platform } = ua;

		function buildUA(raw: Record<IterateKey, string | object>): Record<IterateKey, string> {
			function serializeValue(value: string | object): string {
				if (!value || (typeof value === "object" && Object.keys(value).length === 0)) {
					return "unknown";
				}
				return typeof value === "string" ? value : JSON.stringify(value);
			}

			const result: Partial<Record<IterateKey, string>> = {};
			const iterateKeys = ["platform", "os", "browser", "ip"];

			for (const [key, value] of Object.entries(raw) as [IterateKey, string | object][]) {
				if (!iterateKeys.includes(key)) continue;

				if (key === "ip" && typeof value === "string" && IP_WHITELIST.includes(value as (typeof IP_WHITELIST)[number])) {
					result[key] = IP_WHITELIST[0];
					continue;
				}

				result[key] = serializeValue(value);
			}

			return result as Record<IterateKey, string>;
		}

		const infoUpdated = { browser, engine, os, platform, ip };
		const processedUA = buildUA(infoUpdated);

		const payload: UserSessionPayload = {
			nickname,
			created_at: dayjs().toDate(),
			...processedUA,
		};

		const createUserSessionPp = redis
			.multi()
			.set(newSessionKey, JSON.stringify(payload), "PX", DEFAULT_SESSION_EXPIRE)
			.zadd(userSessionsKey, Date.now(), token)
			.expire(userSessionsKey, DEFAULT_SESSION_EXPIRE)

		const createUserSessionResults = await createUserSessionPp.exec();
		console.log("createUserSessionResults", createUserSessionResults);

		const expires_at = new Date(Date.now() + DEFAULT_SESSION_EXPIRE_MS);

		if (isProduction) {
			this.afterLoginEvents({ nickname });
		}

		return { token, expires_at };
	},
	async delete(token: string): Promise<boolean> {
		const redis = getRedis();
		const sessionKey = auth.getUserKey(token);

		const nickname = await redis.get(sessionKey);
		if (!nickname) return false;

		const userSessionsKey = this.getUserSessionsKey(nickname);

		const pp = redis
			.multi()
			.del(sessionKey)
			.zrem(userSessionsKey, token)

		const results = await pp.exec();
		console.log("deleteSessionResults", results);

		return true;
	}
}

// targets:
// AUTH, players, bisquite, shared (lobby), reputation, playerpoints, luckperms
async function deleteAccount({ nickname }: { nickname: string }) { }

type LoginQRKeyPayload = {
	ua: string;
	vId: string;
	ip: string;
	status: "pending" | "verified" | "confirmed"
	verifiedBy?: string
};

export const TOKEN_ERROR_CODES = {
	TOKEN_EXPIRED: 1,
	USER_NOT_FOUND: 2
};

export const TOKEN_MSG_RECORDS = {
	[TOKEN_ERROR_CODES.TOKEN_EXPIRED]: "Token is expired or not found",
};

export const loginQR = {
	QR_VERIFY_TIMEOUT_S: 120,
	QR_CONFIRM_TIMEOUT_S: 60,
	getQRTokenKey: (token: string) => `auth:qr:${token}`,
	createAuthQRSubject: (type: QREventsEvent, token: string) => `auth.qr.${type}.${token}`,
	getAuthQRSubject: (token: string) => `auth.qr.*.${token}`,
	_notify(type: QREventsEvent, token: string) {
		const nc = getNats();

		nc.publish(
			this.createAuthQRSubject(type, token),
			JSON.stringify({ data: token })
		);
	},
	async generate({
		visitorId, ip, ua
	}: {
		visitorId: string; ua: string; ip: string;
	}): Promise<QRGeneratePayload> {
		const token = nanoid(12);
		const redis = getRedis();

		const key = this.getQRTokenKey(token);
		const pd: LoginQRKeyPayload = {
			ua, vId: visitorId, ip,
			status: "pending",
		};

		await redis
			.pipeline()
			.hset(key, pd)
			.expire(key, this.QR_VERIFY_TIMEOUT_S)
			.exec();

		return { token };
	},
	async deleteToken(token: string): Promise<void> {
		const key = this.getQRTokenKey(token);
		const redis = getRedis();
		const status = await redis.hget(key, "status") as Nullable<LoginQRKeyPayload["status"]>

		if (!status || status !== 'verified') {
			await redis.del(key)
			return;
		}
	},
	async checkQRTokenExistence(token: string): Promise<number> {
		const redis = getRedis();
		const key = this.getQRTokenKey(token);
		return redis.exists(key);
	},
	async confirm({ token, nickname }: { token: string, nickname: string }): Promise<void> {
		const key = this.getQRTokenKey(token);
		const redis = getRedis();
		const currStatus = await redis.hget(key, "status");

		if (currStatus !== "pending") {
			throw new Error("Invalid or expired token state");
		}

		const updatePd: Partial<LoginQRKeyPayload> = {
			status: "verified",
			verifiedBy: nickname
		}

		await redis.hset(key, updatePd);

		this._notify("verified", token);
	},
	async getData(token: string) {
		const key = this.getQRTokenKey(token);
		const redis = getRedis();

		const data = await redis.hgetall(key);
		if (!data || Object.keys(data).length === 0) {
			throw new Error("Token is expired or not found");
		}

		return {
			...(data as unknown as LoginQRKeyPayload),
			timestampz: new Date().toISOString()
		};
	},
	async decline({ token }: { token: string }) {
		const redis = getRedis();
		const key = this.getQRTokenKey(token);
		await redis.del(key);

		this._notify("declined", token);
	},
	async afterCreateSession({ qrToken }: { qrToken: string }) {
		const redis = getRedis();
		const key = this.getQRTokenKey(qrToken);

		const status = await redis.hget(key, "status");
		if (status !== "verified") return;

		const updatePd: Partial<LoginQRKeyPayload> = {
			status: "confirmed"
		}

		await redis
			.pipeline()
			.hset(key, updatePd)
			.expire(key, this.QR_CONFIRM_TIMEOUT_S)
			.exec()
	}
} as const;