import { bisquite } from "#/shared/database/bisquite-db";
import { general } from "#/shared/database/general-db";
import { lobby } from "#/shared/database/lobby-db";
import { luckperms } from "#/shared/database/luckperms-db";
import { playerpoints } from "#/shared/database/playerpoints-db";
import { reputation } from "#/shared/database/reputation-db";
import { getPlayerUUIDCacheRedisKey } from "@repo/core/modules/player";
import { auth, authLogger } from "#/modules/auth/auth.model";
import { session } from "#/modules/auth/login.model";
import { tokenService } from "#/modules/yggdrasil/token.model";
import { redisService } from "#/shared/redis/client";
import { type Static, t } from "elysia";

type Base = {
	nickname: string;
};

// Deletes the canonical account and everything keyed to it. External stores are
// best effort: a missing row in one of them must not block the deletion.
export async function deleteAccount({
	nickname,
	ip,
}: { ip: string } & Base): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" }> {
	const account = await auth.getAccount(nickname);

	if (!account) return { ok: false, error: "NOT_FOUND" };

	const { uuid } = account;

	await Promise.allSettled([
		bisquite.deleteFrom("cmi_users").where("username", "=", nickname).execute(),
		lobby.deleteFrom("ajparkour_players").where("name", "=", nickname).execute(),
		reputation.deleteFrom("reputation").where("uuid", "=", uuid).execute(),
		playerpoints.deleteFrom("playerpoints_username_cache").where("username", "=", nickname).execute(),
		luckperms.deleteFrom("luckperms_players").where("uuid", "=", uuid).execute(),
	]);

	await general.transaction().execute(async (trx) => {
		await trx.deleteFrom("account_credentials").where("account_id", "=", account.id).execute();
		await trx.deleteFrom("accounts").where("id", "=", account.id).execute();
		await trx.deleteFrom("AUTH").where("LOWERCASENICKNAME", "=", nickname.toLowerCase()).execute();
		await trx.deleteFrom("players").where("lower_case_nickname", "=", nickname.toLowerCase()).execute();
	});

	const revokedTokens = await tokenService.revokeAccount(account.id);
	const revokedSessions = await session.deleteAll(account.nickname);

	await redisService.getInstance().del(getPlayerUUIDCacheRedisKey(nickname)).catch(() => undefined);

	authLogger.info(
		`Account deleted: ${account.nickname} (uuid=${uuid}, ip=${ip}); ${revokedTokens} game token(s), ${revokedSessions} session(s) revoked`,
	);

	return { ok: true };
}

export const changePasswordSchema = t.Object({
	currentPass: t.String({ minLength: 1 }),
	newPass: t.String({ minLength: 8, maxLength: 72 }),
});

export type ChangePasswordError = "NOT_FOUND" | "PASSWORD_OR_LOGIN_INCORRECT" | "PASSWORD_IS_UNSAFE";

/**
 * Changes the password of an account. `AUTH.HASH` is dual-written: LimboAuth
 * still checks it until the proxy cutover, after which the column is dropped.
 */
export async function changePassword({
	nickname,
	currentPass,
	newPass,
	ip,
}: Static<typeof changePasswordSchema> & { ip: string } & Base): Promise<{ ok: true } | { ok: false; error: ChangePasswordError }> {
	if (!auth.validatePasswordSafe(newPass)) return { ok: false, error: "PASSWORD_IS_UNSAFE" };

	const account = await auth.getAccount(nickname);
	if (!account) return { ok: false, error: "NOT_FOUND" };

	if (!(await Bun.password.verify(currentPass, account.hash))) {
		return { ok: false, error: "PASSWORD_OR_LOGIN_INCORRECT" };
	}

	const passHash = await Bun.password.hash(newPass, {
		algorithm: "bcrypt",
		cost: 10,
	});

	await general.transaction().execute(async (trx) => {
		await trx
			.updateTable("account_credentials")
			.set({ password_hash: passHash, password_updated_at: new Date() })
			.where("account_id", "=", account.id)
			.execute();

		await trx
			.updateTable("AUTH")
			.set({ HASH: passHash })
			.where("LOWERCASENICKNAME", "=", account.nickname.toLowerCase())
			.execute();
	});

	// A password change ends every existing credential: launcher/web sessions and
	// game tokens issued before it.
	const revokedTokens = await tokenService.revokeAccount(account.id);
	const revokedSessions = await session.deleteAll(account.nickname);

	authLogger.info(
		`Password changed for ${account.nickname} (ip=${ip}); revoked ${revokedTokens} game token(s), ${revokedSessions} session(s)`,
	);

	return { ok: true };
}
