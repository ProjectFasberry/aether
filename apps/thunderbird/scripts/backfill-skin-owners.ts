/**
 * Backfills `skin_owners` from the names in `sr_custom_skins`.
 *
 *   infisical run --env=dev --path=/thunderbird -- bun run scripts/backfill-skin-owners.ts
 *   ... --apply
 *
 * Dry run by default. Uploads name skins `sr-<nickname>-<suffix>`; a name is
 * matched only when exactly one account has that nickname. Ambiguous, missing
 * and conflicting rows are reported and left untouched.
 *
 * `DB_TARGET` / `SKINS_DB_TARGET` rewrite the URI host the same way
 * `seed-activity.ts` does, for runs outside the container network.
 */
import { sql } from "kysely";

const apply = Bun.argv.includes("--apply");
const CHUNK = 500;

const rewrite = (envName: string, target: string | undefined) => {
	const uri = Bun.env[envName];
	if (!target || !uri) return;

	const url = new URL(uri);
	const [host, port] = target.split(":");
	url.hostname = host;
	url.port = port;
	Bun.env[envName] = url.toString();
};

rewrite("GENERAL_POSTGRES_URI", Bun.env["DB_TARGET"]);
rewrite("SKINS_MYSQL_URI", Bun.env["SKINS_DB_TARGET"]);

const envModule = await import("../src/shared/env");
envModule.initEnv();

const { skins } = await import("../src/shared/database/skins-db");
const { general } = await import("../src/shared/database/general-db");
const { parseSkinName } = await import("@repo/core/modules/skins/ownership");

const table = await sql<{ present: number }>`
	select count(*) as present
	from information_schema.tables
	where table_schema = database() and table_name = 'skin_owners'
`.execute(skins);

if (!table.rows[0]?.present) {
	console.error("skin_owners is missing: apply 0001_skins_ownership.sql first");
	process.exit(1);
}

const customSkins = await skins
	.selectFrom("sr_custom_skins")
	.select(["name"])
	.execute();

const candidates = new Map<string, string[]>();
const unparseable: string[] = [];

for (const { name } of customSkins) {
	const nickname = parseSkinName(name);
	if (!nickname) {
		unparseable.push(name);
		continue;
	}

	const key = nickname.toLowerCase();
	candidates.set(key, [...(candidates.get(key) ?? []), name]);
}

const accounts = new Map<string, { nickname: string; uuid: string }>();
const keys = [...candidates.keys()];

for (let i = 0; i < keys.length; i += CHUNK) {
	const chunk = keys.slice(i, i + CHUNK);
	const found = await general
		.selectFrom("accounts")
		.select(["nickname", "uuid", "lower_nickname"])
		.where("lower_nickname", "in", chunk)
		.execute();

	for (const account of found) {
		accounts.set(account.lower_nickname, { nickname: account.nickname, uuid: account.uuid });
	}
}

const owners = await sql<{ skin_name: string; owner_uuid: string }>`
	select skin_name, owner_uuid from skin_owners
`.execute(skins);
const ownerBySkin = new Map(owners.rows.map((row) => [row.skin_name, row.owner_uuid]));

const matched: { skinName: string; uuid: string }[] = [];
const alreadyOwned: string[] = [];
const conflicts: string[] = [];
const unmatched: string[] = [];

for (const [lowerNickname, names] of candidates) {
	const account = accounts.get(lowerNickname);

	if (!account) {
		unmatched.push(...names);
		continue;
	}

	for (const skinName of names) {
		const existing = ownerBySkin.get(skinName);

		if (!existing) {
			matched.push({ skinName, uuid: account.uuid });
		} else if (existing === account.uuid) {
			alreadyOwned.push(skinName);
		} else {
			conflicts.push(skinName);
		}
	}
}

console.log(`total: ${customSkins.length}`);
console.log(`matched: ${matched.length}`);
console.log(`already owned: ${alreadyOwned.length}`);
console.log(`conflict: ${conflicts.length}`);
console.log(`unmatched: ${unmatched.length}`);
console.log(`unparseable: ${unparseable.length}`);

const sample = (label: string, values: string[]) => {
	if (values.length === 0) return;
	console.log(`${label}: ${values.slice(0, 5).join(", ")}${values.length > 5 ? ", ..." : ""}`);
};

sample("conflict rows", conflicts);
sample("unmatched rows", unmatched);
sample("unparseable rows", unparseable);

if (!apply) {
	console.log("dry run: pass --apply to write skin_owners");
	process.exit(0);
}

const now = Math.floor(Date.now() / 1000);

for (let i = 0; i < matched.length; i += CHUNK) {
	const batch = matched.slice(i, i + CHUNK);

	await sql`
		insert ignore into skin_owners (skin_name, owner_uuid, is_public, created_at)
		values ${sql.join(
			batch.map((row) => sql`(${row.skinName}, ${row.uuid}, 0, ${now})`),
			sql`, `,
		)}
	`.execute(skins);
}

console.log(`written: ${matched.length}`);
process.exit(0);
