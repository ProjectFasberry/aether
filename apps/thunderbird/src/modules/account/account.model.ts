import { bisquite } from "#/shared/database/bisquite-db";
import { general } from "#/shared/database/general-db";
import { lobby } from "#/shared/database/lobby-db";
import { luckperms } from "#/shared/database/luckperms-db";
import { playerpoints } from "#/shared/database/playerpoints-db";
import { reputation } from "#/shared/database/reputation-db";
import { getPlayerUUIDCacheRedisKey } from "#/utils/player/uuid";
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

export async function changePassword({
	nickname,
	currentPass,
	newPass,
}: Static<typeof changePasswordSchema> & { ip: string } & Base) {}
