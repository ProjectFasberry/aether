import { redisService } from "#/shared/redis/client";
import { safeJsonParse } from "#/utils";
import type { AccountProfile } from "./profile.model";

/**
 * Yggdrasil tokens live in Redis only: an access token identifies a game
 * session, a refresh token lets the launcher renew it without another login.
 *
 * - access token record: 30 days in Redis, logically valid for 24 hours, so a
 *   refresh can still resolve the account after the access token expired;
 * - join record: 30 seconds, consumed once by `hasJoined`.
 */
const ACCESS_TTL_S = 24 * 60 * 60;
const RECORD_TTL_S = 30 * 24 * 60 * 60;
const JOIN_TTL_S = 30;

const accessKey = (token: string) => `ygg:token:${token}`;
const joinKey = (serverId: string) => `ygg:join:${serverId}`;

export type TokenRecord = {
	account_id: number;
	uuid: string;
	nickname: string;
	issued_at: number;
	expires_at: number;
};

export type JoinRecord = {
	uuid: string;
	nickname: string;
	created_at: number;
};

const randomToken = () =>
	Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");

export const tokenService = {
	async issue(account: AccountProfile): Promise<{ access: string; record: TokenRecord }> {
		const now = Date.now();
		const record: TokenRecord = {
			account_id: account.id,
			uuid: account.uuid,
			nickname: account.nickname,
			issued_at: now,
			expires_at: now + ACCESS_TTL_S * 1000,
		};
		const access = randomToken();

		await redisService
			.getInstance()
			.set(accessKey(access), JSON.stringify(record), "EX", RECORD_TTL_S);

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
		await redisService.getInstance().del(accessKey(access));
	},

	async saveJoin(serverId: string, record: TokenRecord): Promise<void> {
		const join: JoinRecord = {
			uuid: record.uuid,
			nickname: record.nickname,
			created_at: Date.now(),
		};

		await redisService
			.getInstance()
			.set(joinKey(serverId), JSON.stringify(join), "EX", JOIN_TTL_S);
	},

	/** Single use: `hasJoined` deletes the record before answering. */
	async consumeJoin(serverId: string): Promise<JoinRecord | null> {
		const raw = await redisService.getInstance().getdel(joinKey(serverId));

		if (typeof raw !== "string" || !raw) return null;

		const parsed = safeJsonParse<JoinRecord>(raw);

		return parsed.ok ? parsed.value : null;
	},
};
