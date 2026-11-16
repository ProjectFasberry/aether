import { bisquite } from "#/shared/database/bisquite-db";
import { lobby } from "#/shared/database/lobby-db";
import { luckperms } from "#/shared/database/luckperms-db";
import { playerpoints } from "#/shared/database/playerpoints-db";
import { reputation } from "#/shared/database/reputation-db";
import { authLogger } from "./auth.model";

/**
 * Registration writes the canonical account to `general`; the game and plugin
 * databases keep their own player rows. They are separate engines, so there is
 * no shared transaction: every step is idempotent and failures are logged
 * instead of failing an already committed registration.
 */
export type PlayerProfile = {
	nickname: string;
	uuid: string;
};

/** LuckPerms group every new player starts in. */
const DEFAULT_LUCKPERMS_GROUP = "default";

const profileLogger = authLogger.child({ name: "player-profiles" });

async function ensureLuckPerms({ nickname, uuid }: PlayerProfile) {
	const existing = await luckperms
		.selectFrom("luckperms_players")
		.select("uuid")
		.where("uuid", "=", uuid)
		.executeTakeFirst();

	if (existing) return;

	await luckperms
		.insertInto("luckperms_players")
		.values({ uuid, username: nickname, primary_group: DEFAULT_LUCKPERMS_GROUP })
		.execute();
}

async function ensurePlayerPoints({ nickname, uuid }: PlayerProfile) {
	const existing = await playerpoints
		.selectFrom("playerpoints_username_cache")
		.select("username")
		.where("username", "=", nickname)
		.executeTakeFirst();

	if (existing) return;

	await playerpoints
		.insertInto("playerpoints_username_cache")
		.values({ username: nickname, uuid })
		.execute();
}

async function ensureReputation({ nickname, uuid }: PlayerProfile) {
	const existing = await reputation
		.selectFrom("reputation")
		.select("id")
		.where("uuid", "=", uuid)
		.executeTakeFirst();

	if (existing) return;

	await reputation.insertInto("reputation").values({ uuid }).execute();
	void nickname;
}

async function ensureCmi({ nickname, uuid }: PlayerProfile) {
	const existing = await bisquite
		.selectFrom("cmi_users")
		.select("player_uuid")
		.where("player_uuid", "=", uuid)
		.executeTakeFirst();

	if (existing) return;

	await bisquite
		.insertInto("cmi_users")
		.values({ player_uuid: uuid, username: nickname, nickname })
		.execute();
}

async function ensureParkour({ nickname, uuid }: PlayerProfile) {
	const existing = await lobby
		.selectFrom("ajparkour_players")
		.select("id")
		.where("id", "=", uuid)
		.executeTakeFirst();

	if (existing) return;

	await lobby.insertInto("ajparkour_players").values({ id: uuid, name: nickname }).execute();
}

const PROFILE_STEPS: [string, (profile: PlayerProfile) => Promise<void>][] = [
	["luckperms", ensureLuckPerms],
	["playerpoints", ensurePlayerPoints],
	["reputation", ensureReputation],
	["bisquite", ensureCmi],
	["lobby", ensureParkour],
];

/**
 * Creates the player row in every plugin database. Safe to call again: each
 * step checks for an existing row first, so it also backfills old accounts.
 */
export async function ensurePlayerProfiles(profile: PlayerProfile): Promise<void> {
	await Promise.all(
		PROFILE_STEPS.map(async ([name, step]) => {
			try {
				await step(profile);
			} catch (error) {
				profileLogger.error({
					message: `${name} profile row failed for ${profile.nickname}`,
					error,
				});
			}
		}),
	);
}
