import { isProduction } from "#/shared/env";
import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import dayjs from "dayjs";
import { authLogger, auth } from "./auth.model";
import { invariant, safeJsonParse } from "@repo/shared/lib/utils";
import Bowser from "bowser";
import { redisService } from "#/shared/redis/client";
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import { nanoid } from "nanoid";
import type { QREventsEvent, QRGeneratePayload } from "@repo/shared/types/entities/auth";
import { type Static, t, type Context } from "elysia";
import { getClientDomain, SESSION_KEY } from "#/utils/auth/cookie";
import { DateTime } from "#/helpers/typebox";
import { cookie } from "#/utils";

export const loginLogger = authLogger.child({ name: "login" });
export const qrLogger = loginLogger.child({ name: "qr" });

type CreateSession = {
  nickname: string;
  userAgentStr?: string;
  ip: string;
};

type CreateSessionPayload = {
  expires_at: Date;
  token: string;
};

export const sessionPayloadSchema = t.Object({
  nickname: t.String(),
  created_at: DateTime,
  ip: t.String(),
  browser: t.String(),
  platform: t.String(),
  os: t.String(),
});

export const sessionsPayloadSchema = t.Array(sessionPayloadSchema);

export const sessionParsedPayloadSchema = t.Composite([
  t.Pick(sessionPayloadSchema, ["nickname", "ip", "created_at"]),
  t.Object({
    browser: t.Object({
      name: t.String(),
      version: t.String(),
    }),
    os: t.Object({
      name: t.Optional(t.String()),
      versionName: t.Optional(t.String()),
    }),
    platform: t.Object({
      type: t.Optional(t.String()),
    }),
  }),
]);
export const sessionsParsedPayloadSchema = t.Array(sessionParsedPayloadSchema);

export type UserSessionPayload = Static<typeof sessionPayloadSchema>;
export type UserSessionParsedPayload = Static<typeof sessionParsedPayloadSchema>;

const SESSION_EXPIRE_S = 60 * 60 * 24 * 30; // 30 days
const SESSION_EXPIRE_MS = SESSION_EXPIRE_S * 1000;
const MIN_SESSION_EXPIRE_S = SESSION_EXPIRE_S / 2; // 15 days
const MIN_SESSION_EXPIRE_MS = MIN_SESSION_EXPIRE_S * 1000;
const SESSIONS_LENGTH_LIMIT = 15; // 15 sessions per user

const IP_WHITELIST = ["127.0.0.1", "::1", "localhost"] as const;

type IterateKey = "platform" | "os" | "browser" | "ip";

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

type StringifiedUserSessionParsedPayload = Pick<UserSessionParsedPayload, "nickname" | "ip" | "created_at"> & {
  browser: string;
  platform: string;
  os: string;
};

export const session = {
  async refreshSession(token: string) {
    const redisClient = redisService.getInstance();
    const sessionKey = auth.getSessionKey(token);

    const remainingTtlMs = await redisClient.pttl(sessionKey);
    if (remainingTtlMs < 0) return;

    if (remainingTtlMs < MIN_SESSION_EXPIRE_MS) {
      const sessionDataStr = await redisClient.get(sessionKey);
      invariant(sessionDataStr, "User is not defined");

      const sessionData = JSON.parse(sessionDataStr) as UserSessionPayload;
      const nickname = sessionData.nickname;

      const userSessionsKey = sessions.getUserSessionsKey(nickname);
      const newExpiresAtTimestamp = Date.now() + SESSION_EXPIRE_MS;

      const refreshSessionResult = await redisClient
        .multi()
        .pexpireat(sessionKey, newExpiresAtTimestamp)
        .pexpireat(userSessionsKey, newExpiresAtTimestamp)
        .exec();

      invariant(refreshSessionResult, "Transaction failed");

      refreshSessionResult.forEach(([error, result]) => {
        if (!isProduction) {
          loginLogger.log("refreshSessionResult", { error, result });
        }

        if (error) {
          throw error;
        }
      });

      return {
        nickname,
        expires_at: new Date(newExpiresAtTimestamp),
      };
    }
  },
  async getIsExistsSession(token: string): Promise<boolean> {
    const result = await auth.getUserNickname(token);
    return Boolean(result);
  },
  async updateSession(token: string | null, cookies: Context["cookie"]) {
    if (!token) return;

    const refreshResult = await this.refreshSession(token);
    if (!refreshResult) return;

    const { expires_at, nickname } = refreshResult;

    cookie.set({
      cookies,
      domain: getClientDomain(),
      expires: expires_at,
      value: token,
      key: SESSION_KEY,
    })

    if (!isProduction) {
      loginLogger.debug(`Session updated for ${nickname} ${expires_at.getDate()}`);
    }
  },
  generateSessionToken(): string {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    return encodeBase32LowerCaseNoPadding(bytes);
  },
  _afterLoginEvents({ nickname }: { nickname: string }) {
    natsService
      .getInstance()
      .publish(SUBJECTS.EVENTS.AUTHORIZATION.LOGIN, JSON.stringify({ created_at: dayjs().toDate(), nickname }));
  },
  async create({ userAgentStr, ip, nickname }: CreateSession): Promise<CreateSessionPayload> {
    const redisClient = redisService.getInstance();

    const userSessionsKey = sessions.getUserSessionsKey(nickname);
    const currSessionsCount = await redisClient.zcard(userSessionsKey);

    if (currSessionsCount >= SESSIONS_LENGTH_LIMIT) {
      const oldestSessions = await redisClient.zrange(userSessionsKey, 0, 0);

      if (oldestSessions.length > 0) {
        const oldestToken = oldestSessions[0];
        const userSessionKey = auth.getSessionKey(oldestToken);

        const removalPipeline = redisClient
          .multi()
          .zrem(userSessionsKey, oldestToken)
          .del(userSessionKey);

        await removalPipeline.exec();
      }
    }

    const ua = Bowser.parse(userAgentStr ?? "");
    const { browser, engine, os, platform } = ua;
    const infoUpdated = { browser, engine, os, platform, ip };
    const processedUA = buildUA(infoUpdated);

    const payload: UserSessionPayload = {
      nickname,
      created_at: dayjs().toDate(),
      ...processedUA,
    };

    const token = this.generateSessionToken();
    const newSessionKey = auth.getSessionKey(token);

    const createUserSessionResult = await redisClient
      .multi()
      .set(newSessionKey, JSON.stringify(payload), "EX", SESSION_EXPIRE_S)
      .zadd(userSessionsKey, Date.now(), token)
      .expire(userSessionsKey, SESSION_EXPIRE_S)
      .exec();

    invariant(createUserSessionResult, "Transaction failed");

    createUserSessionResult.forEach(([error, result]) => {
      if (!isProduction) {
        loginLogger.debug(`createUserSessionResult`, { error, result });
      }

      if (error) {
        throw error;
      }
    });

    const expires_at = new Date(Date.now() + SESSION_EXPIRE_MS);

    if (isProduction) {
      this._afterLoginEvents({ nickname });
    }

    if (!isProduction) {
      loginLogger.debug(`Session created for ${nickname} ${expires_at.getDate()}`);
    }

    return { token, expires_at };
  },
  async delete(sessionToken: string): Promise<void> {
    const redisClient = redisService.getInstance();
    const sessionKey = auth.getSessionKey(sessionToken);

    const sessionDataStr = await redisClient.get(sessionKey);
    invariant(sessionDataStr, "User is not defined");

    const sessionData = JSON.parse(sessionDataStr) as UserSessionPayload;
    const nickname = sessionData.nickname;

    const userSessionsKey = sessions.getUserSessionsKey(nickname);

    const deleteSessionResult = await redisClient
      .multi()
      .del(sessionKey)
      .zrem(userSessionsKey, sessionToken)
      .exec();

    invariant(deleteSessionResult, "Transaction failed");

    deleteSessionResult.forEach(([error, result]) => {
      if (!isProduction) {
        loginLogger.debug(`deleteSessionResult`, { error, result });
      }

      if (error) {
        throw error;
      }
    });

    if (!isProduction) {
      loginLogger.debug(`Session deleted for ${nickname}`);
    }
  },
  async get({
    nickname,
    sessionToken,
  }: {
    nickname: string;
    sessionToken: string;
  }): Promise<UserSessionParsedPayload | null> {
    const redisClient = redisService.getInstance();

    const sessionsKey = sessions.getUserSessionsKey(nickname);

    const dataKeysStr = await redisClient.zrange(sessionsKey, 0, -1);
    if (dataKeysStr.length === 0) return null;

    const sessionKey = auth.getSessionKey(sessionToken);
    const dataRowStr = await redisClient.get(sessionKey);
    if (!dataRowStr) return null;

    const dataRow = safeJsonParse<StringifiedUserSessionParsedPayload>(dataRowStr);
    if (dataRow.ok === false) {
      throw dataRow.error;
    }

    return {
      ...dataRow.value,
      browser: JSON.parse(dataRow.value.browser),
      platform: JSON.parse(dataRow.value.platform),
      os: JSON.parse(dataRow.value.os),
      created_at: dayjs(dataRow.value.created_at).toDate(),
    };
  },
};

async function getSessionsRows(sessionsKeys: string[]): Promise<UserSessionParsedPayload[]> {
  if (sessionsKeys.length === 0) return [];

  const redisClient = redisService.getInstance();

  const dataRowsStr = await redisClient.mget(sessionsKeys);
  const dataRowsStrFiltered = dataRowsStr.filter((k): k is string => k !== null);
  if (dataRowsStrFiltered.length === 0) return [];

  return dataRowsStrFiltered.map((v) => {
    const dataRow = safeJsonParse<StringifiedUserSessionParsedPayload>(v);
    if (dataRow.ok === false) {
      throw dataRow.error;
    }

    return {
      ...dataRow.value,
      browser: JSON.parse(dataRow.value.browser),
      platform: JSON.parse(dataRow.value.platform),
      os: JSON.parse(dataRow.value.os),
      created_at: dayjs(dataRow.value.created_at).toDate(),
    };
  });
}

export const sessions = {
  getUserSessionsKey: (nickname: string) => `user_sessions:${nickname}`,
  async get(nickname: string): Promise<UserSessionParsedPayload[]> {
    const redisClient = redisService.getInstance();

    const sessionsListKey = this.getUserSessionsKey(nickname);

    const sessionsStrArr: string[] = await redisClient.zrange(sessionsListKey, 0, -1);
    if (sessionsStrArr.length === 0) return [];

    const sessionsKeys = sessionsStrArr.map((value) => auth.getSessionKey(value));

    const dataRows = await getSessionsRows(sessionsKeys);
    return dataRows;
  },
  async delete({ nickname, sessionToken }: { nickname: string; sessionToken: string }) {
    const redisClient = redisService.getInstance();

    const sessionsListKey = sessions.getUserSessionsKey(nickname);
    const currentSessionScore = await redisClient
      .zscore(sessionsListKey, sessionToken);

    if (currentSessionScore === null) throw new Error("INSUFFICIENT_PERMISSION_BY_EXISTANCE");

    const sessionCreationTime = Number(currentSessionScore);
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

    if (Date.now() - sessionCreationTime < threeDaysInMs) {
      throw new Error("INSUFFICIENT_PERMISSION_BY_TIME");
    }

    const allSessionTokens = await redisClient.zrange(sessionsListKey, 0, -1);
    if (allSessionTokens.length <= 1) return;

    const tokensToDelete = allSessionTokens.filter((token) => token !== sessionToken);
    const keysToDelete = tokensToDelete.map((token) => auth.getSessionKey(token));

    const deleteResult = await redisClient
      .multi()
      .del(...keysToDelete)
      .zrem(sessionsListKey, ...tokensToDelete)
      .exec();

    invariant(deleteResult, "Transaction failed");

    deleteResult.forEach(([error, result]) => {
      if (!isProduction) {
        authLogger.debug("deleteAllSessionsResult", { error, result });
      }
    });
  },
  async deleteById({
    nickname,
    targetToken,
    sessionToken,
  }: {
    nickname: string;
    targetToken: string;
    sessionToken: string;
  }) {
    const redisClient = redisService.getInstance();

    const sessionsListKey = sessions.getUserSessionsKey(nickname);
    const currentSessionScore = await redisClient.zscore(sessionsListKey, sessionToken);

    if (currentSessionScore === null) throw new Error("INSUFFICIENT_PERMISSION_BY_EXISTANCE");

    const sessionCreationTime = Number(currentSessionScore);
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

    if (Date.now() - sessionCreationTime < threeDaysInMs) {
      throw new Error("INSUFFICIENT_PERMISSION_BY_TIME");
    }

    const targetSessionScore = await redisClient.zscore(sessionsListKey, targetToken);
    if (targetSessionScore === null) return;

    const targetKeyToDelete = auth.getSessionKey(targetToken);

    const deleteResult = await redisClient
      .multi()
      .del(targetKeyToDelete)
      .zrem(sessionsListKey, targetToken)
      .exec();

    invariant(deleteResult, "Transaction failed");

    deleteResult.forEach(([error, result]) => {
      if (!isProduction) {
        authLogger.debug("deleteSessionByIdResult", { error, result });
      }
    });
  },
};

type LoginQRKeyPayload = {
  ua: string;
  vId: string;
  ip: string;
  status: "pending" | "verified" | "confirmed";
  verifiedBy?: string;
};

export const TOKEN_ERROR_CODES = {
  TOKEN_EXPIRED: 1,
  USER_NOT_FOUND: 2,
};

export const TOKEN_MSG_RECORDS = {
  [TOKEN_ERROR_CODES.TOKEN_EXPIRED]: "Token is expired or not found",
};

type LoginQRGenerateParams = {
  visitorId: string;
  userAgentStr: string;
  ip: string;
};
const QR_VERIFY_TIMEOUT_S = 120;
const QR_CONFIRM_TIMEOUT_S = 60;

export const loginQR = {
  getQRTokenKey: (token: string) => `auth:qr:${token}`,
  getQRSubject: (token: string) => `auth.qr.*.${token}`,
  createQRSubject: (type: QREventsEvent, token: string) => `auth.qr.${type}.${token}`,
  _afterEvents(type: QREventsEvent, token: string) {
    natsService
      .getInstance()
      .publish(this.createQRSubject(type, token), JSON.stringify({ data: token }));
  },
  async generate({ visitorId, ip, userAgentStr }: LoginQRGenerateParams): Promise<QRGeneratePayload> {
    const token = nanoid(12);
    const redisClient = redisService.getInstance();
    const key = this.getQRTokenKey(token);

    const payload: LoginQRKeyPayload = {
      ua: userAgentStr,
      vId: visitorId,
      ip,
      status: "pending",
    };

    const createQRResult = await redisClient
      .pipeline()
      .hset(key, payload)
      .expire(key, QR_VERIFY_TIMEOUT_S)
      .exec();

    invariant(createQRResult, "Pipeline failed");

    createQRResult.forEach(([error, result]) => {
      if (!isProduction) {
        qrLogger.debug(`createQRResult`, { error, result });
      }

      if (error) {
        throw error;
      }
    });

    return { token };
  },
  async deleteToken(token: string): Promise<void> {
    const redisClient = redisService.getInstance();
    const key = this.getQRTokenKey(token);
    const status = (await redisClient.hget(key, "status")) as LoginQRKeyPayload["status"];

    if (status !== "verified") {
      await redisClient.del(key);
      return;
    }
  },
  async checkQRTokenExistence(token: string): Promise<number> {
    const redisClient = redisService.getInstance();
    const key = this.getQRTokenKey(token);
    return await redisClient.exists(key);
  },
  async confirm({ token, nickname }: { token: string; nickname: string }): Promise<void> {
    const redisClient = redisService.getInstance();
    const key = this.getQRTokenKey(token);

    const currStatus = await redisClient.hget(key, "status");
    if (currStatus !== "pending") throw new Error("Invalid or expired token state");

    const updatePd: Pick<LoginQRKeyPayload, "status" | "verifiedBy"> = {
      status: "verified",
      verifiedBy: nickname,
    };

    await redisClient.hset(key, updatePd);

    this._afterEvents("verified", token);
  },
  async getData(token: string) {
    const redisClient = redisService.getInstance();
    const key = this.getQRTokenKey(token);

    const data = await redisClient.hgetall(key);
    if (!data || Object.keys(data).length === 0) {
      throw new Error("Token is expired or not found")
    };

    return {
      ...(data as unknown as LoginQRKeyPayload),
      timestampz: new Date().toISOString(),
    };
  },
  async decline({ token }: { token: string }) {
    const redisClient = redisService.getInstance();
    const key = this.getQRTokenKey(token);
    await redisClient.del(key);

    this._afterEvents("declined", token);
  },
  async afterCreateSession({ qrToken }: { qrToken: string }) {
    const redisClient = redisService.getInstance();
    const key = this.getQRTokenKey(qrToken);

    const status = await redisClient.hget(key, "status");
    if (status !== "verified") return;

    const updatePd: Partial<LoginQRKeyPayload> = {
      status: "confirmed",
    };

    const createSessionQRResult = await redisClient
      .pipeline()
      .hset(key, updatePd)
      .expire(key, QR_CONFIRM_TIMEOUT_S)
      .exec();

    invariant(createSessionQRResult, "Pipeline failed");

    createSessionQRResult.forEach(([error, result]) => {
      if (!isProduction) {
        qrLogger.debug("createSessionQRResult", { error, result });
      }

      if (error) {
        throw error;
      }
    });
  },
} as const;
