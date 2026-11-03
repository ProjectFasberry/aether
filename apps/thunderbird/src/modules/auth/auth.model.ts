import { general } from "#/shared/database/general-db";
import { redisService } from "#/shared/redis/client";
import { logger } from "@repo/shared/utils/logger";
import { textSets } from "#/shared/minio/utils";
import type { UserSessionPayload } from "./login.model";
import { safeJsonParse } from "#/utils";

export const authLogger = logger.child({ name: "auth" });

/** Hard ceiling for a session, regardless of activity (sliding TTL refreshes). */
const MAX_SESSION_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export type Account = {
	id: number;
	nickname: string;
	uuid: string;
	hash: string;
};

export const auth = {
	getSessionKey: (token: string) => `session:${token}`,
	/** Accounts are canonical; the legacy `AUTH` table is no longer read. */
	async getAccount(nickname: string): Promise<Account | null> {
		const query = await general
			.selectFrom("accounts")
			.innerJoin("account_credentials", "account_credentials.account_id", "accounts.id")
			.select([
				"accounts.id",
				"accounts.nickname",
				"accounts.uuid",
				"account_credentials.password_hash as hash",
			])
			.where("accounts.lower_nickname", "=", nickname.toLowerCase())
			.executeTakeFirst();

		return query ?? null;
	},
	/** Identity without the password hash, used for session validation. */
	async getUserIdentity(nickname: string): Promise<{ nickname: string; uuid: string } | null> {
		const query = await general
			.selectFrom("accounts")
			.select(["nickname", "uuid"])
			.where("lower_nickname", "=", nickname.toLowerCase())
			.executeTakeFirst();

		return query ?? null;
	},
	async getExistsUser(nickname: string): Promise<{ result: false; hash: null } | { result: true; hash: string }> {
		const account = await this.getAccount(nickname);

		if (!account) return { hash: null, result: false };

		return { hash: account.hash, result: true };
	},
	async getSessionPayload(token: string): Promise<UserSessionPayload | null> {
    const data = await redisService
      .getInstance()
      .get(this.getSessionKey(token));

		if (!data) return null;

		const result = safeJsonParse<UserSessionPayload>(data);
		if (!result.ok) return null;

		// Sliding TTL keeps an active session alive forever; cap the absolute age.
		const created = new Date(result.value.created_at).getTime();
		if (Number.isFinite(created) && Date.now() - created > MAX_SESSION_AGE_MS) return null;

		return result.value;
	},
	async getUserNickname(token: string): Promise<string | null> {
		const payload = await this.getSessionPayload(token);

		return payload?.nickname ?? null;
	},
	validatePasswordSafe(pwd: string): boolean {
		const unsafePasswords = textSets["unsafe_passwords.txt"];
		return !unsafePasswords.has(pwd.trim());
	},
};
