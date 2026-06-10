import { general } from "#/shared/database/general-db";
import { redis } from "#/shared/redis/client";
import { logger } from "#/shared/constants/logger";
import { textSets } from "#/utils/minio/load-internal-files";
import type { UserSessionPayload } from "./login.model";
import { safeJsonParse } from "#/utils";

export const authLogger = logger.withTag("Auth");

export const auth = {
	getSessionKey: (token: string) => `session:${token}`,
	async getExistsUser(nickname: string): Promise<{ result: false; hash: null } | { result: true; hash: string }> {
		const query = await general.selectFrom("AUTH").select("HASH").where("NICKNAME", "=", nickname).executeTakeFirst();

		if (!query) return { hash: null, result: false };

		return { hash: query.HASH, result: true };
	},
	async getUserNickname(token: string): Promise<string | null> {
		const data = await redis.getInstance().get(this.getSessionKey(token));

		if (!data) return null;

		const result = safeJsonParse<UserSessionPayload>(data);
		if (!result.ok) return null;

		return result.value.nickname ?? null;
	},
	validatePasswordSafe(pwd: string): boolean {
		const unsafePasswords = textSets["unsafe_passwords.txt"];
		return !unsafePasswords.has(pwd.trim());
	},
};
