import { isProduction } from "#/shared/env";
import { getNats } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import dayjs from "dayjs";
import {
	authLogger,
	DEFAULT_SESSION_EXPIRE,
	DEFAULT_SESSION_EXPIRE_MS,
	getUserKey,
	getUserSessionsKey,
	USER_SESSIONS_LIMIT,
	type UserSessionPayload,
} from "./auth.model";
import { invariant } from "@repo/shared/lib/utils";
import Bowser from "bowser";
import { getRedis } from "#/shared/redis/init";
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import { nanoid } from "nanoid";
import type { QREventsEvent, QRGeneratePayload } from "@repo/shared/schemas/auth/login";

type CreateSession = {
	nickname: string;
	userAgentStr?: string;
	ip: string;
};

export const loginLogger = authLogger.withTag("Login");
export const qrLogger = loginLogger.withTag("QR");

export function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}

export async function createSession({
	userAgentStr,
	ip,
	nickname,
}: CreateSession): Promise<{ expires_at: Date; token: string }> {
	const redis = getRedis();

	const token = generateSessionToken();
	const ua = Bowser.parse(userAgentStr ?? "");

	const userSessionsKey = getUserSessionsKey(nickname);
	const newSessionKey = getUserKey(token);
	const currentTimestamp = Date.now();

	const pipeline = redis.multi();
	pipeline.zcard(userSessionsKey);

	const results = await pipeline.exec();
	invariant(results, "Transaction failed and returned null");

	const [execResult] = results;

	if (execResult[0]) {
		throw execResult[0];
	}

	const currentSessionCount = execResult[1] as number;

	if (currentSessionCount >= USER_SESSIONS_LIMIT) {
		loginLogger.log(`Limit reached for user ${nickname}. Removing the oldest session`);

		const oldestSessions = await redis.zrange(userSessionsKey, 0, 0);

		if (oldestSessions.length > 0) {
			const oldestToken = oldestSessions[0];
			const removalPipeline = redis.multi();

			removalPipeline.zrem(userSessionsKey, oldestToken);
			removalPipeline.del(getUserKey(token));

			await removalPipeline.exec();
		}
	}

	const creationPipeline = redis.multi();

	const ip_whitelist = ["127.0.0.1", "::1", "localhost"] as const;
	type IterateKey = "platform" | "os" | "browser" | "ip";
	const iterateKeys = ["platform", "os", "browser", "ip"];

	const { browser, engine, os, platform } = ua;
	const infoUpdated = { browser, engine, os, platform, ip };

	function buildUA(raw: Record<IterateKey, string | object>): Record<IterateKey, string> {
		function serializeValue(value: string | object): string {
			if (!value || (typeof value === "object" && Object.keys(value).length === 0)) {
				return "unknown";
			}
			return typeof value === "string" ? value : JSON.stringify(value);
		}

		const result: Partial<Record<IterateKey, string>> = {};

		for (const [key, value] of Object.entries(raw) as [IterateKey, string | object][]) {
			if (!iterateKeys.includes(key)) continue;

			if (key === "ip" && typeof value === "string" && ip_whitelist.includes(value as (typeof ip_whitelist)[number])) {
				result[key] = ip_whitelist[0];
				continue;
			}

			result[key] = serializeValue(value);
		}

		return result as Record<IterateKey, string>;
	}

	const processedUA = buildUA(infoUpdated);

	const payload: UserSessionPayload = {
		nickname,
		created_at: dayjs().toDate(),
		...processedUA,
	};

	creationPipeline.set(newSessionKey, JSON.stringify(payload), "PX", DEFAULT_SESSION_EXPIRE);
	creationPipeline.zadd(userSessionsKey, currentTimestamp, token);
	creationPipeline.expire(userSessionsKey, DEFAULT_SESSION_EXPIRE);
	await creationPipeline.exec();

	const expires_at = new Date(Date.now() + DEFAULT_SESSION_EXPIRE_MS);

	afterLoginEvents({ nickname });

	return { token, expires_at };
}

export async function afterLoginEvents({ nickname }: { nickname: string }) {
	if (!isProduction) {
		loginLogger.warn("Skipping afterLoginEvents on development");
		return;
	}

	const nc = getNats();

	const payload = {
		created_at: dayjs().toDate(),
		nickname,
	}

	nc.publish(SUBJECTS.EVENTS.AUTHORIZATION.LOGIN, JSON.stringify(payload));
}

export async function deleteSession(token: string): Promise<boolean> {
	const redis = getRedis();
	const sessionKey = getUserKey(token);
	const nickname = await redis.get(sessionKey);

	if (!nickname) {
		loginLogger.warn(`Attempted to delete a non-existent session with token: ${token}`);
		return false;
	}

	const userSessionsKey = getUserSessionsKey(nickname);

	const pipeline = redis.multi();
	pipeline.del(sessionKey);
	pipeline.zrem(userSessionsKey, token);
	await pipeline.exec();

	return true;
}

// targets:
// AUTH, players, bisquite, shared (lobby), reputation, playerpoints, luckperms
async function deleteAccount({ nickname }: { nickname: string }) { }

const QR_VERIFY_TIMEOUT_S = 120;
const QR_CONFIRM_TIMEOUT_S = 60;

const BASE_API_URL = "http://127.0.0.1:4104";

type LoginQRKeyPayload = {
	ua: string;
	vId: string;
	ip: string;
	status: "pending" | "verified" | "confirmed"
	verifiedBy?: string
};

export function loginQR() {
	const redis = getRedis();
	const nc = getNats();
	
	type QRGenerateParams = {
		visitorId: string;
		ua: string;
		ip: string;
	};

	const createAuthQRSubject = (type: QREventsEvent, token: string) => `auth.qr.${type}.${token}`
	const getAuthQRSubject = (token: string) => `auth.qr.*.${token}`
	const getQRTokenKey = (token: string) => `auth:qr:${token}`;

	const notify = (type: QREventsEvent, token: string) => {
		const subject = createAuthQRSubject(type, token);
		nc.publish(subject, JSON.stringify({ data: token }));
	};
	
	async function generate({ visitorId, ip, ua }: QRGenerateParams): Promise<QRGeneratePayload> {
		const token = nanoid(12);

		const key = getQRTokenKey(token);
		const pd: LoginQRKeyPayload = {
			ua, vId: visitorId, ip,
			status: "pending",
		};

		await redis
			.pipeline()
			.hset(key, pd)
			.expire(key, QR_VERIFY_TIMEOUT_S)
			.exec();

		const url = new URL(`${BASE_API_URL}/auth/login/qr/callback`);
		url.searchParams.set("e", "verify");
		url.searchParams.set("token", token);

		return { payload: url.href, token };
	}

	async function deleteToken(token: string): Promise<void> {
		const key = getQRTokenKey(token);
		const status = await redis.hget(key, "status") as LoginQRKeyPayload["status"] | null

		if (!status || status !== 'verified') {
			return void redis.del(key);
		}
	}

	async function checkQRTokenExistence(token: string): Promise<number> {
		const key = getQRTokenKey(token);
		return redis.exists(key);
	}

	async function confirm({ token, nickname }: { token: string, nickname: string }): Promise<void> {
		const key = getQRTokenKey(token);

		const currentStatus = await redis.hget(key, "status");

		if (currentStatus !== "pending") {
			throw new Error("Invalid or expired token state");
		}

		const updatePd: Partial<LoginQRKeyPayload> = {
			status: "verified",
			verifiedBy: nickname
		}

		await redis.hset(key, updatePd);

		notify("verified", token);
	}

	async function getData(token: string) {
		const key = getQRTokenKey(token);

		const data = await redis.hgetall(key);
		if (!data || (Object.keys(data).length === 0)) {
			throw new Error("Token is expired or not found");
		}

		return {
			...(data as unknown as LoginQRKeyPayload),
			timestampz: new Date().toISOString()
		};
	}

	async function decline({ token }: { token: string }) {
		const key = getQRTokenKey(token);
		await redis.del(key);

		notify("declined", token);
	}

	async function afterCreateSession({ qrToken }: { qrToken: string }) {
		const key = getQRTokenKey(qrToken);

		const status = await redis.hget(key, "status");
		if (status !== "verified") return;

		const updatePd: Partial<LoginQRKeyPayload> = {
			status: "confirmed"
		}

		await redis
			.pipeline()
			.hset(key, updatePd)
			.expire(key, QR_CONFIRM_TIMEOUT_S)
			.exec()
	}

	return {
		generate,
		deleteToken,
		confirm,
		getData,
		decline,
		checkQRTokenExistence,
		afterCreateSession,
		createAuthQRSubject,
		getAuthQRSubject
	};
}