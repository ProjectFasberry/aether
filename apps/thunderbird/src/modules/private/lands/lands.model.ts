import { bisquite } from "#/shared/database/bisquite-db";
import { general } from "#/shared/database/general-db";
import { skinsService } from "#/shared/services/skins";
import { createError, withShared } from "#/helpers/error";
import { getDirection, toPageMeta } from "#/helpers/pagination";
import { DateTime } from "#/helpers/typebox";
import { withMeta } from "#/shared/schemas";
import { safeJsonParse } from "@repo/shared/utils";
import { logger } from "@repo/shared/utils/logger";
import type { DB as BisquiteDB } from "@gen/db/bisquite";
import { t } from "elysia";
import { sql, type Kysely, type Transaction } from "kysely";
import { executeWithCursorPagination } from "kysely-paginate";
import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";

export type LandMemberMap = Record<string, { chunks: number }>;

export type AdminLandMember = {
	uuid: string;
	nickname: string;
	chunks: number;
	avatar: string;
};

export type AdminLand = {
	ulid: string;
	name: string;
	title: string | null;
	type: string;
	level: number;
	created_at: Date;
	world: string;
	server: string;
	owner: AdminLandMember | null;
	members: AdminLandMember[];
};

export type EligiblePlayer = {
	uuid: string;
	nickname: string;
	avatar: string;
};

export const adminLandMemberSchema = t.Object({
	uuid: t.String(),
	nickname: t.String(),
	chunks: t.Number(),
	avatar: t.String(),
});

export const adminLandSchema = t.Object({
	ulid: t.String(),
	name: t.String(),
	title: t.Nullable(t.String()),
	type: t.String(),
	level: t.Number(),
	created_at: DateTime,
	world: t.String(),
	server: t.String(),
	owner: t.Nullable(adminLandMemberSchema),
	members: t.Array(adminLandMemberSchema),
});

export const adminLandListPayload = t.Object({
	data: t.Array(adminLandSchema),
	meta: withMeta,
});

export const eligiblePlayerSchema = t.Object({
	uuid: t.String(),
	nickname: t.String(),
	avatar: t.String(),
});

const playersSchema = t.Array(t.String({ minLength: 36, maxLength: 36 }), { minItems: 1 });

export const createRandomLandSchema = t.Object({
	players: playersSchema,
	chunks: t.Optional(t.Integer({ minimum: 1, maximum: 100_000 })),
	name: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
	title: t.Optional(t.String({ minLength: 1, maxLength: 300 })),
});

export const createManualLandSchema = t.Object({
	players: playersSchema,
	name: t.String({ minLength: 1, maxLength: 64 }),
	title: t.Optional(t.String({ minLength: 1, maxLength: 300 })),
	type: t.String({ minLength: 1, maxLength: 64 }),
	level: t.Optional(t.Integer({ minimum: 1, maximum: 1000 })),
	chunks: t.Optional(t.Integer({ minimum: 1, maximum: 100_000 })),
	stats: t.Optional(t.Object({
		kills: t.Integer({ minimum: 0 }),
		deaths: t.Integer({ minimum: 0 }),
		wins: t.Integer({ minimum: 0 }),
		defeats: t.Integer({ minimum: 0 }),
		captures: t.Integer({ minimum: 0 }),
	})),
});

const LAND_ERRORS = {
	NO_TEMPLATE: { msg: "No land template found", code: 500 },
	NO_SERVER: { msg: "No lands server configured", code: 500 },
	NO_WORLD: { msg: "No lands world configured", code: 500 },
	PLAYER_NOT_FOUND: { msg: "Player not found", code: 404 },
	PLAYER_IN_LAND: { msg: "Player already belongs to a land", code: 409 },
	INVALID_PLAYERS: { msg: "Select at least one player", code: 400 },
} as const;

export const landAdminError = createError(withShared(LAND_ERRORS), "INTERNAL_UNKNOWN");

type AdminLandRow = {
	ulid: string;
	name: string;
	title: string | null;
	type: string;
	level: number;
	created_at: Date | string;
	world_name: string | null;
	server: string;
	members: string;
};

async function getOccupiedUuids(
	db: Kysely<BisquiteDB> | Transaction<BisquiteDB>,
): Promise<Set<string>> {
	const rows = await db.selectFrom("lands_lands").select("members").execute();
	const occupied = new Set<string>();

	for (const row of rows) {
		const parsed = safeJsonParse<LandMemberMap>(row.members);

		if (!parsed.ok) {
			logger.warn({ message: "Failed to parse land members", error: parsed.error });
			continue;
		}

		for (const uuid of Object.keys(parsed.value)) occupied.add(uuid);
	}

	return occupied;
}

async function mapAdminLands(rows: AdminLandRow[]): Promise<AdminLand[]> {
	if (rows.length === 0) return [];

	const parsedRows = rows.map((row) => {
		const parsed = safeJsonParse<LandMemberMap>(row.members);

		if (!parsed.ok) {
			logger.warn({ message: "Failed to parse land members", ulid: row.ulid, error: parsed.error });
			return { ...row, memberMap: {} as LandMemberMap };
		}

		return { ...row, memberMap: parsed.value };
	});

	const uuids = Array.from(new Set(
		parsedRows.flatMap((row) => Object.keys(row.memberMap)),
	));

	const players = uuids.length > 0
		? await general
			.selectFrom("players")
			.select(["uuid", "nickname"])
			.where("uuid", "in", uuids)
			.execute()
		: [];

	const playersByUuid = new Map(players.map((player) => [player.uuid, player]));
	const nicknames = players.map((player) => player.nickname);
	const avatars = await skinsService.players.getAvatar(nicknames);

	return parsedRows.map((row) => {
		const members = Object.entries(row.memberMap).map(([uuid, { chunks }]) => {
			const nickname = playersByUuid.get(uuid)?.nickname ?? "unknown";

			return {
				uuid,
				nickname,
				chunks,
				avatar: avatars[nickname] ?? "",
			};
		});

		return {
			ulid: row.ulid,
			name: row.name,
			title: row.title,
			type: row.type,
			level: Number(row.level),
			created_at: new Date(row.created_at),
			world: row.world_name ?? "",
			server: row.server,
			owner: members[0] ?? null,
			members,
		};
	});
}

export async function getAdminLands({
	asc,
	limit,
	endCursor,
	searchQuery,
}: {
	asc?: boolean;
	limit: number;
	endCursor?: string;
	searchQuery?: string;
}): Promise<{ data: AdminLand[]; meta: ReturnType<typeof toPageMeta> }> {
	let query = bisquite
		.selectFrom("lands_lands")
		.leftJoin("lands_worlds", "lands_worlds.ulid", "lands_lands.world")
		.select([
			"lands_lands.ulid",
			"lands_lands.name",
			"lands_lands.title",
			"lands_lands.type",
			"lands_lands.level",
			"lands_lands.created_at",
			"lands_lands.server",
			"lands_lands.members",
			"lands_worlds.name as world_name",
		]);

	if (searchQuery) {
		query = query.where((eb) => eb.or([
			eb("lands_lands.name", "like", `%${searchQuery}%`),
			eb("lands_lands.title", "like", `%${searchQuery}%`),
		]));
	}

	const direction = getDirection(asc);

	const result = await executeWithCursorPagination(query, {
		perPage: limit,
		after: endCursor,
		fields: [
			{ key: "created_at", direction, expression: "created_at" },
		],
		parseCursor: (cursor) => ({
			created_at: new Date(cursor.created_at),
		}),
	});

	return {
		data: await mapAdminLands(result.rows as AdminLandRow[]),
		meta: toPageMeta(result),
	};
}

export async function getEligiblePlayers({
	searchQuery,
	limit,
}: {
	searchQuery?: string;
	limit: number;
}): Promise<EligiblePlayer[]> {
	const occupied = await getOccupiedUuids(bisquite);
	const result: Array<{ uuid: string; nickname: string }> = [];
	const pageSize = 500;
	let offset = 0;

	while (result.length < limit && offset < 5000) {
		let query = general
			.selectFrom("players")
			.select(["uuid", "nickname"])
			.orderBy("nickname", "asc")
			.limit(pageSize)
			.offset(offset);

		if (searchQuery) {
			query = query.where("nickname", "ilike", `%${searchQuery}%`);
		}

		const rows = await query.execute();

		for (const row of rows) {
			if (!occupied.has(row.uuid)) result.push(row);
		}

		if (rows.length < pageSize) break;

		offset += pageSize;
	}

	const selected = result.slice(0, limit);
	const avatars = await skinsService.players.getAvatar(selected.map((player) => player.nickname));

	return selected.map((player) => ({
		...player,
		avatar: avatars[player.nickname] ?? "",
	}));
}

type LandTemplate = {
	server: string;
	world: string;
	area: string;
	type: string;
	stats: string | null;
	balance: number;
	shield: number;
	category: string | null;
	nation: string | null;
	spawn: string | null;
	inbox: string | null;
	limits: string | null;
	icon: string | null;
	storage: string | null;
};

const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Crockford base32 ULID; Lands validates these identifiers. */
function createUlid(): string {
	const now = Date.now();
	let timePart = "";
	let time = now;

	for (let index = 0; index < 10; index++) {
		timePart = ULID_ALPHABET[time % 32] + timePart;
		time = Math.floor(time / 32);
	}

	let random = 0n;
	for (const byte of randomBytes(10)) random = (random << 8n) | BigInt(byte);

	let randomPart = "";
	for (let index = 0; index < 16; index++) {
		randomPart = ULID_ALPHABET[Number(random & 31n)] + randomPart;
		random >>= 5n;
	}

	return timePart + randomPart;
}

/**
 * A fresh database has no lands to copy an area from. Build the same shape the
 * Lands plugin serializes, using the latest overworld registered for the
 * server. The plugin fills in roles and claims on load.
 */
async function createDefaultLandTemplate(
	trx: Transaction<BisquiteDB>,
): Promise<LandTemplate> {
	const server = await trx
		.selectFrom("lands_servers")
		.select("server")
		.orderBy("server", "asc")
		.limit(1)
		.executeTakeFirst();

	if (!server) throw landAdminError.raise("NO_SERVER");

	const worlds = await trx
		.selectFrom("lands_worlds")
		.select(["ulid", "name"])
		.where("server", "=", server.server)
		.orderBy("ulid", "desc")
		.execute();

	const world = worlds.find((entry) => !/(_nether|_the_end)$/i.test(entry.name)) ?? worlds[0];

	if (!world) throw landAdminError.raise("NO_WORLD");

	return {
		server: server.server,
		world: world.ulid,
		area: JSON.stringify({
			ulid: createUlid(),
			holder: { roles: [], trusted: [] },
			settings: [],
			invites: [],
			tax: { current: 0, time: 0, before: 0 },
			banned: [],
		}),
		type: "LAND",
		stats: JSON.stringify({
			kills: 0,
			deaths: 0,
			wins: 0,
			defeats: 0,
			captures: 0,
		}),
		balance: 0,
		shield: 0,
		category: null,
		nation: null,
		spawn: null,
		inbox: null,
		limits: null,
		icon: null,
		storage: null,
	};
}

type CreateLandInput = {
	players: string[];
	name?: string;
	title?: string;
	type?: string;
	level?: number;
	chunks?: number;
	stats?: {
		kills: number;
		deaths: number;
		wins: number;
		defeats: number;
		captures: number;
	};
};

export async function createAdminLand(input: CreateLandInput): Promise<AdminLand> {
	const playerUuids = Array.from(new Set(input.players));

	if (playerUuids.length === 0) throw landAdminError.raise("INVALID_PLAYERS");

	const players = await general
		.selectFrom("players")
		.select(["uuid", "nickname"])
		.where("uuid", "in", playerUuids)
		.execute();

	if (players.length !== playerUuids.length) {
		throw landAdminError.raise("PLAYER_NOT_FOUND");
	}

	const created = await bisquite.transaction().execute(async (trx) => {
		const occupied = await getOccupiedUuids(trx);

		if (playerUuids.some((uuid) => occupied.has(uuid))) {
			throw landAdminError.raise("PLAYER_IN_LAND");
		}

		const existing = await trx
			.selectFrom("lands_lands")
			.select([
				"server",
				"world",
				"area",
				"type",
				"stats",
				"balance",
				"shield",
				"category",
				"nation",
				"spawn",
				"inbox",
				"limits",
				"icon",
				"storage",
			])
			.orderBy(sql`RAND()`)
			.limit(1)
			.executeTakeFirst();

		const template = existing ?? await createDefaultLandTemplate(trx);
		const chunks = input.chunks ?? 4;
		const members = JSON.stringify(Object.fromEntries(
			playerUuids.map((uuid, index) => [uuid, { chunks: index === 0 ? chunks : 0 }]),
		));

		const ulid = createUlid();

		await trx
			.insertInto("lands_lands")
			.values({
				ulid,
				server: template.server,
				world: template.world,
				type: input.type?.trim() || template.type,
				category: template.category,
				name: input.name?.trim() || `region-${nanoid(6)}`,
				nation: template.nation,
				area: template.area,
				members,
				created_at: new Date(),
				balance: template.balance,
				title: input.title?.trim() || null,
				spawn: template.spawn,
				inbox: template.inbox,
				limits: template.limits,
				shield: template.shield,
				stats: input.stats ? JSON.stringify(input.stats) : template.stats,
				icon: template.icon,
				storage: template.storage,
				level: input.level ?? 1,
			})
			.executeTakeFirstOrThrow();

		const row = await trx
			.selectFrom("lands_lands")
			.leftJoin("lands_worlds", "lands_worlds.ulid", "lands_lands.world")
			.select([
				"lands_lands.ulid",
				"lands_lands.name",
				"lands_lands.title",
				"lands_lands.type",
				"lands_lands.level",
				"lands_lands.created_at",
				"lands_lands.server",
				"lands_lands.members",
				"lands_worlds.name as world_name",
			])
			.where("lands_lands.ulid", "=", ulid)
			.executeTakeFirstOrThrow();

		return row as AdminLandRow;
	});

	const [land] = await mapAdminLands([created]);

	return land!;
}

export async function deleteAdminLand(ulid: string): Promise<boolean> {
	const existing = await bisquite
		.selectFrom("lands_lands")
		.select("ulid")
		.where("ulid", "=", ulid)
		.executeTakeFirst();

	if (!existing) return false;

	await bisquite.transaction().execute(async (trx) => {
		await trx.deleteFrom("lands_banners").where("ulid", "=", ulid).execute();
		await trx.deleteFrom("lands_gallery").where("ulid", "=", ulid).execute();
		await trx.deleteFrom("lands_lands").where("ulid", "=", ulid).execute();
	});

	return true;
}

