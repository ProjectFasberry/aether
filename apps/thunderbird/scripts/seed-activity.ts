/**
 * Seeds synthetic presence history for the player metrics page.
 *
 *   infisical run --env=prod --path=/thunderbird -- \
 *     bun run scripts/seed-activity.ts --days=30 --players=10
 *
 * Every seeded row carries `session = 'mock-seed'`, so the demo data can be
 * removed again without touching real events:
 *
 *   ... bun run scripts/seed-activity.ts --delete
 *
 * Optional: `--servers=bisquite,lobby`, `--dry-run`.
 */
import { sql } from "kysely";

const MARKER = "mock-seed";
const DEFAULT_SERVERS = ["bisquite", "lobby", "creative"];

const args = Bun.argv.slice(2);
const flag = (name: string, fallback?: string) => {
	const inline = args.find((arg) => arg.startsWith(`--${name}=`));
	if (inline) return inline.slice(name.length + 3);

	const index = args.indexOf(`--${name}`);
	return index === -1 ? fallback : (args[index + 1] ?? fallback);
};

const days = Number(flag("days", "30"));
const playersLimit = Number(flag("players", "10"));
const servers = (flag("servers") ?? DEFAULT_SERVERS.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const dryRun = args.includes("--dry-run");
const remove = args.includes("--delete");

/** The injected URI points at the host loopback; DB_TARGET=host:port reaches it from here. */
const target = Bun.env["DB_TARGET"];
if (target && Bun.env["GENERAL_POSTGRES_URI"]) {
	const url = new URL(Bun.env["GENERAL_POSTGRES_URI"]);
	const [host, port] = target.split(":");
	url.hostname = host;
	url.port = port;
	Bun.env["GENERAL_POSTGRES_URI"] = url.toString();
}

const envModule = await import("../src/shared/env");
envModule.initEnv();

const { general } = await import("../src/shared/database/general-db");

if (remove) {
	if (dryRun) {
		const rows = await general
			.selectFrom("activity_users")
			.select(sql<number>`count(*)::int`.as("count"))
			.where("session", "=", MARKER)
			.executeTakeFirst();
		console.log(`dry run: ${rows?.count ?? 0} seeded rows would be removed`);
	} else {
		const result = await general
			.deleteFrom("activity_users")
			.where("session", "=", MARKER)
			.executeTakeFirst();
		console.log(`removed ${Number(result.numDeletedRows ?? 0)} seeded rows`);
	}

	process.exit(0);
}

const players = await general
	.selectFrom("players")
	.select(["nickname", "uuid"])
	.orderBy(sql`random()`)
	.limit(Math.max(1, playersLimit))
	.execute();

if (players.length === 0) {
	console.error("no players in the database: seed needs real nicknames");
	process.exit(1);
}

/** Evenings are busier than mornings, like the real server. */
const randomHour = () => {
	const hour = Math.round(Math.random() * 23);
	return hour < 6 ? hour + 12 : hour;
};

const rows: {
	event: string;
	nickname: string;
	type: "join" | "quit";
	server: string;
	uuid: string | null;
	session: string;
}[] = [];

const now = Date.now();

for (let day = 0; day < days; day += 1) {
	for (const player of players) {
		const sessions = 1 + Math.round(Math.random());

		for (let index = 0; index < sessions; index += 1) {
			const server = servers[Math.floor(Math.random() * servers.length)];
			const startedAt = now - day * 24 * 60 * 60 * 1000;
			const offset = randomHour() * 60 * 60 * 1000 + Math.floor(Math.random() * 60) * 60 * 1000;
			const joinAt = new Date(startedAt + offset);
			const duration = (20 + Math.floor(Math.random() * 220)) * 60 * 1000;
			const quitAt = new Date(Math.min(joinAt.getTime() + duration, now));

			rows.push({
				event: joinAt.toISOString(),
				nickname: player.nickname,
				type: "join",
				server,
				uuid: player.uuid,
				session: MARKER,
			});

			if (quitAt.getTime() > joinAt.getTime()) {
				rows.push({
					event: quitAt.toISOString(),
					nickname: player.nickname,
					type: "quit",
					server,
					uuid: player.uuid,
					session: MARKER,
				});
			}
		}
	}
}

if (dryRun) {
	console.log(`dry run: ${rows.length} rows for ${players.length} players over ${days} days`);
	process.exit(0);
}

const BATCH = 500;
for (let offset = 0; offset < rows.length; offset += BATCH) {
	await general
		.insertInto("activity_users")
		.values(rows.slice(offset, offset + BATCH))
		.execute();
}

console.log(`seeded ${rows.length} rows: ${players.length} players, ${days} days, servers ${servers.join(", ")}`);
console.log(`rollback: bun run scripts/seed-activity.ts --delete`);
