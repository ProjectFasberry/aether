import { redisService } from "#/shared/redis/client";
import { safeJsonParse } from "#/utils";
import type { AccountProfile } from "./profile.model";

/**
 * Yggdrasil tokens live in Redis only: an access token identifies a game
 * session and can be refreshed within the record window without another login.
 *
 * - access token record: 30 days in Redis, logically valid for 24 hours;
 * - every token is indexed per account (`ygg:account:<id>`) so a password
 *   change can revoke all game sessions at once;
 * - join record: 30 seconds, consumed once by `hasJoined` for the matching
 *   nickname only.
 */
const ACCESS_TTL_S = 24 * 60 * 60;
const RECORD_TTL_S = 30 * 24 * 60 * 60;
const JOIN_TTL_S = 30;

const accessKey = (token: string) => `ygg:token:${token}`;
const accountKey = (accountId: number) => `ygg:account:${accountId}`;
const joinKey = (serverId: string) => `ygg:join:${serverId}`;
const joinNameKey = (serverId: string) => `ygg:join:name:${serverId}`;

/**
 * Consumes the join record only when it belongs to `nickname`; a request from a
 * different name must not burn the ticket of the real client (GET+DEL in Lua so
 * two concurrent callers cannot both win).
 */
const CONSUME_JOIN_SCRIPT = `
local value = redis.call("GET", KEYS[1])
if not value then return nil end
local name = redis.call("GET", KEYS[2])
if not name then return nil end
if string.lower(name) ~= string.lower(ARGV[1]) then return nil end
redis.call("DEL", KEYS[1])
redis.call("DEL", KEYS[2])
return value`;

export type TokenRecord = {
	account_id: number;
	uuid: string;
	nickname: string;
	issued_at: number;
	expires_at: number;
	/** Launcher session the token was minted from; logout revokes only these. */
	session: string;
};

export type JoinRecord = {
	uuid: string;
	nickname: string;
	created_at: number;
};

const randomToken = () =>
	Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");

export const tokenService = {
	async issue(
		account: AccountProfile,
		session: string,
	): Promise<{ access: string; record: TokenRecord }> {
		const now = Date.now();
		const record: TokenRecord = {
			account_id: account.id,
			uuid: account.uuid,
			nickname: account.nickname,
			issued_at: now,
			expires_at: now + ACCESS_TTL_S * 1000,
			session,
		};
		const access = randomToken();

		const redis = redisService.getInstance();
		const index = accountKey(account.id);

		await redis
			.multi()
			.set(accessKey(access), JSON.stringify(record), "EX", RECORD_TTL_S)
			.sadd(index, accessKey(access))
			.expire(index, RECORD_TTL_S)
			.exec();

		return { access, record };
	},

	async get(access: string): Promise<TokenRecord | null> {
		const raw = await redisService.getInstance().get(accessKey(access));
		if (!raw) return null;

		const parsed = safeJsonParse<TokenRecord>(raw);

		return parsed.ok ? parsed.value : null;
	},

	/** Valid = present and inside the 24h window. */
	async validate(access: string): Promise<TokenRecord | null> {
		const record = await this.get(access);

		if (!record) return null;
		if (record.expires_at <= Date.now()) return null;

		return record;
	},

	async drop(access: string): Promise<void> {
		const record = await this.get(access);
		const redis = redisService.getInstance();

		if (!record) {
			await redis.del(accessKey(access));
			return;
		}

		await redis
			.multi()
			.del(accessKey(access))
			.srem(accountKey(record.account_id), accessKey(access))
			.exec();
	},

	/** Revokes every game token of the account (password change, signout). */
	async revokeAccount(accountId: number): Promise<number> {
		const redis = redisService.getInstance();
		const index = accountKey(accountId);
		const keys = await redis.smembers(index);

		if (keys.length === 0) {
			await redis.del(index);
			return 0;
		}

		await redis.multi().del(...keys).del(index).exec();

		return keys.length;
	},

	/** Revokes the game tokens minted from one launcher session (logout); returns the count. */
	async revokeSession(accountId: number, session: string): Promise<number> {
		const redis = redisService.getInstance();
		const index = accountKey(accountId);
		const keys = await redis.smembers(index);

		let revoked = 0;

		for (const key of keys) {
			const raw = await redis.get(key);
			const parsed = raw ? safeJsonParse<TokenRecord>(raw) : null;

			if (!parsed?.ok || parsed.value.session !== session) continue;

			await redis.multi().del(key).srem(index, key).exec();
			revoked += 1;
		}

		return revoked;
	},

	async saveJoin(serverId: string, record: TokenRecord): Promise<void> {
		const join: JoinRecord = {
			uuid: record.uuid,
			nickname: record.nickname,
			created_at: Date.now(),
		};

		const redis = redisService.getInstance();

		await redis
			.multi()
			.set(joinKey(serverId), JSON.stringify(join), "EX", JOIN_TTL_S)
			.set(joinNameKey(serverId), record.nickname, "EX", JOIN_TTL_S)
			.exec();
	},

	/**
	 * Single use: `hasJoined` consumes the record before answering, but only for
	 * the nickname the record was created for.
	 */
	async consumeJoin(serverId: string, nickname: string): Promise<JoinRecord | null> {
		const raw = await redisService
			.getInstance()
			.eval(CONSUME_JOIN_SCRIPT, 2, joinKey(serverId), joinNameKey(serverId), nickname);

		if (typeof raw !== "string" || !raw) return null;

		const parsed = safeJsonParse<JoinRecord>(raw);

		return parsed.ok ? parsed.value : null;
	},
};
