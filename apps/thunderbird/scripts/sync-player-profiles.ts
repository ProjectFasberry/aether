/**
 * Backfills and reconciles player rows across the plugin databases.
 *
 *   infisical run --env=prod --path=/thunderbird -- bun run scripts/sync-player-profiles.ts
 *   ... --apply
 *
 * Dry run by default. For every player it reports:
 *  - plugin databases that have no row for the account;
 *  - `luckperms_players.primary_group` differing from the role's group.
 *
 * With `--apply` it creates the missing rows (`ensurePlayerProfiles`) and
 * rewrites `primary_group` in the LuckPerms storage database. Run `/lp sync` on
 * the servers (or restart them) after the apply so the LuckPerms cache matches.
 *
 * `DB_TARGET` rewrites every `*_URI` host, so the script can run from a
 * workstation against the docker network.
 */

const apply = Bun.argv.includes("--apply");
const CHUNK = 500;

const rewrite = (envName: string, target: string | undefined) => {
	const uri = Bun.env[envName];
	if (!target || !uri) return;

	const url = new URL(uri);
	const [host, port] = target.split(":");
	url.hostname = host;
	if (port) url.port = port;
	Bun.env[envName] = url.toString();
};

const target = Bun.env["DB_TARGET"];
for (const name of [
	"GENERAL_POSTGRES_URI",
	"LUCKPERMS_POSTGRES_URI",
	"PLAYERPOINTS_MYSQL_URI",
	"REPUTATION_MYSQL_URI",
	"BISQUITE_MYSQL_URI",
	"LOBBY_MYSQL_URI",
]) {
	rewrite(name, target);
}

const envModule = await import("../src/shared/env");
envModule.initEnv();

const { general } = await import("../src/shared/database/general-db");
const { luckperms } = await import("../src/shared/database/luckperms-db");
const { bisquite } = await import("../src/shared/database/bisquite-db");
const { lobby } = await import("../src/shared/database/lobby-db");
const { playerpoints } = await import("../src/shared/database/playerpoints-db");
const { reputation } = await import("../src/shared/database/reputation-db");
const { ensurePlayerProfiles } = await import("../src/modules/auth/register-profiles");

type Row = {
	nickname: string;
	uuid: string;
	luckperms_group: string | null;
};

const players = await general
	.selectFrom("players")
	.leftJoin("roles", "roles.id", "players.role_id")
	.select(["players.nickname", "players.uuid", "roles.luckperms_group"])
	.orderBy("players.nickname")
	.execute();

const missing: Row[] = [];
const groupDrift: (Row & { current_group: string })[] = [];

for (const player of players) {
	const [lp, points, rep, cmi, parkour] = await Promise.all([
		luckperms.selectFrom("luckperms_players").select("uuid").where("uuid", "=", player.uuid).executeTakeFirst(),
		playerpoints
			.selectFrom("playerpoints_username_cache")
			.select("username")
			.where("username", "=", player.nickname)
			.executeTakeFirst(),
		reputation.selectFrom("reputation").select("id").where("uuid", "=", player.uuid).executeTakeFirst(),
		bisquite
			.selectFrom("cmi_users")
			.select("player_uuid")
			.where("player_uuid", "=", player.uuid)
			.executeTakeFirst(),
		lobby.selectFrom("ajparkour_players").select("id").where("id", "=", player.uuid).executeTakeFirst(),
	]);

	if (!lp || !points || !rep || !cmi || !parkour) missing.push(player);
}

const lpRows = await luckperms.selectFrom("luckperms_players").select(["uuid", "primary_group"]).execute();
const groupsByUuid = new Map(lpRows.map((row) => [row.uuid, row.primary_group]));

for (const player of players) {
	if (!player.luckperms_group) continue;

	const current = groupsByUuid.get(player.uuid);
	if (current && current !== player.luckperms_group) {
		groupDrift.push({ ...player, current_group: current });
	}
}

console.log(`players: ${players.length}`);
console.log(`missing plugin rows: ${missing.length}`);
for (const player of missing.slice(0, 20)) console.log(`  - ${player.nickname}`);
if (missing.length > 20) console.log(`  ... ${missing.length - 20} more`);

console.log(`luckperms group drift: ${groupDrift.length}`);
for (const player of groupDrift.slice(0, 20)) {
	console.log(`  - ${player.nickname}: ${player.current_group} -> ${player.luckperms_group}`);
}
if (groupDrift.length > 20) console.log(`  ... ${groupDrift.length - 20} more`);

if (!apply) {
	console.log("\ndry run; re-run with --apply to write the changes");
	process.exit(0);
}

for (let index = 0; index < players.length; index += CHUNK) {
	const chunk = players.slice(index, index + CHUNK);
	await Promise.all(
		chunk.map(async (player) => {
			try {
				await ensurePlayerProfiles({ nickname: player.nickname, uuid: player.uuid });
			} catch (error) {
				console.error(`profile backfill failed for ${player.nickname}: ${String(error)}`);
			}
		}),
	);
}

for (const player of groupDrift) {
	await luckperms
		.updateTable("luckperms_players")
		.set({ primary_group: player.luckperms_group ?? "default" })
		.where("uuid", "=", player.uuid)
		.execute();
}

console.log(`applied: ${players.length} profiles, ${groupDrift.length} groups`);
console.log("restart the game servers or run `/lp sync` so the LuckPerms cache matches");
process.exit(0);
