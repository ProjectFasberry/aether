import { bisquite } from "#/shared/database/bisquite-db";
import { general } from "#/shared/database/general-db";
import { lobby } from "#/shared/database/lobby-db";
import { luckperms } from "#/shared/database/luckperms-db";
import { playerpoints } from "#/shared/database/playerpoints-db";
import { reputation } from "#/shared/database/reputation-db";
import { getPlayerUUIDCacheRedisKey } from "@repo/core/modules/player";
import { auth, authLogger } from "#/modules/auth/auth.model";
import bcrypt from "bcryptjs";
import { type Static, t } from "elysia";

type Base = {
	nickname: string;
};

// depends tables: auth, players, bisquite, lobby, reputation, playerpoints, luckperms
export async function deleteAccount({ nickname, ip }: { ip: string } & Base) {
	const uuid = getPlayerUUIDCacheRedisKey(nickname);

	async function deleteFromAuth() {
		const query = await general
			.deleteFrom("AUTH")
			.where("AUTH.LOWERCASENICKNAME", "=", nickname.toLowerCase())
			.executeTakeFirstOrThrow();

		return query;
	}
	async function deleteFromBisquite() {
		const query = await bisquite.deleteFrom("cmi_users").where("username", "=", nickname).executeTakeFirstOrThrow();

		return query;
	}
	async function deleteFromLobby() {
		const query = await lobby.deleteFrom("ajparkour_players").where("name", "=", nickname).executeTakeFirstOrThrow();

		return query;
	}
	async function deleteFromReputation() {
		const query = await reputation.deleteFrom("reputation").where("uuid", "=", uuid).executeTakeFirstOrThrow();

		return query;
	}
	async function deleteFromPlayerpoints() {
		const query = await playerpoints
			.deleteFrom("playerpoints_username_cache")
			.where("username", "=", nickname)
			.executeTakeFirstOrThrow();

		return query;
	}
	async function deleteFromLuckperms() {
		const query = await luckperms.deleteFrom("luckperms_players").where("uuid", "=", uuid).executeTakeFirstOrThrow();

		return query;
	}

	return;
}

export const changePasswordSchema = t.Object({
	currentPass: t.String({ minLength: 6 }),
	newPass: t.String({ minLength: 6 }),
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

	if (!bcrypt.compareSync(currentPass, account.hash)) {
		return { ok: false, error: "PASSWORD_OR_LOGIN_INCORRECT" };
	}

	const passHash = Bun.password.hashSync(newPass, {
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

	authLogger.info(`Password changed for ${account.nickname} (ip=${ip})`);

	return { ok: true };
}
