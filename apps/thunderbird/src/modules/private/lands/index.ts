import { createError, withShared } from "#/helpers/error";
import { defineRequiredUser } from "#/lib/define";
import { landSchema } from "#/modules/server/lands/lands.model";
import { skinsService } from "#/modules/server/skin/index.model";
import { bisquite } from "#/shared/database/bisquite-db";
import { general } from "#/shared/database/general-db";
import { redis } from "#/shared/redis/client";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary, safeJsonParse, wrapError } from "#/utils";
import { createPlayerService } from "@repo/core/modules/player";
import Elysia, { type Static, t } from "elysia";
import { sql } from "kysely";
import { nanoid } from "nanoid";

// Fields for creating a land
// required:
// - owner nickname
// - land name
// - initial chunks size
// optional:
// - title

const createLandSchema = t.Object({
	name: t.String({ min: 1 }),
	initialChunksSize: t.Number({ min: 1 }),
	title: t.Optional(t.String({ min: 1 })),
});

const createLandSchemaPayload = t.Composite([
	t.Object({
		owner: t.Object({
			nickname: t.String(),
			avatar: t.String(),
		}),
		world: t.String(),
		server: t.String(),
	}),
	t.Pick(landSchema, ["area", "ulid", "title", "name"]),
]);

const CREATE_LAND_INTERNAL_ERRORS = {
	NO_DEFAULTS: { msg: "No land defaults found", code: 500 },
} as const;
const createLandError = createError(withShared(CREATE_LAND_INTERNAL_ERRORS), "INTERNAL_UNKNOWN");

const playerService = createPlayerService({
	generalDb: general,
	redis: redis.getInstance,
});

async function createLand(
	{ name, initialChunksSize, title }: Static<typeof createLandSchema>,
	initiator: string,
): Promise<Static<typeof createLandSchemaPayload>> {
	const query = await bisquite.transaction().execute(async (trx) => {
		const { ulid: worldUlid } = await trx.selectFrom("lands_worlds").selectAll().executeTakeFirstOrThrow();

		const { server: serverName } = await trx.selectFrom("lands_servers").selectAll().executeTakeFirstOrThrow();

		// todo: impl the area input
		// currently using random area from lands_lands
		const defaults = await trx
			.selectFrom("lands_lands")
			.select(["area", "type", "world", "stats"])
			.orderBy(sql`RAND()`)
			.limit(1)
			.executeTakeFirst();
		if (!defaults) throw createLandError.raise("NO_DEFAULTS");
		//

		const uuid = await playerService.getUUID(initiator);

		// initial members
		const members = JSON.stringify({
			[uuid]: { chunks: initialChunksSize },
		});

		const query = await trx
			.insertInto("lands_lands")
			.values({
				area: defaults.area,
				level: 1,
				name,
				members,
				server: serverName,
				world: worldUlid,
				type: defaults.type,
				ulid: nanoid(12),
				created_at: new Date(),
				title,
				stats: defaults.stats,
			})
			.returning(["area", "name", "title", "members", "world", "server", "ulid"])
			.executeTakeFirstOrThrow();

		return {
			...query,
			owner: initiator,
		};
	});

	const area = safeJsonParse<Static<typeof landSchema>["area"]>(query.area);
	if (!area.ok) throw area.error;

	const result = {
		name: query.name,
		ulid: query.ulid,
		area: area.value,
		title: query.title,
		owner: {
			nickname: query.owner,
			avatar: await skinsService.player.getAvatar(query.owner),
		},
		server: query.server,
		world: query.world,
	};

	return result;
}

const DELETE_LAND_INTERNAL_ERRORS = {
	NOT_FOUND: { msg: "Land not found", code: 404 },
	PERMISSION_DENIED: { msg: "Permission denied", code: 403 },
} as const;
const deleteLandError = createError(withShared(DELETE_LAND_INTERNAL_ERRORS), "INTERNAL_UNKNOWN");

async function deleteLand(ulid: string, initiator: string): Promise<void> {
	const query = await bisquite.transaction().execute(async (trx) => {
		const land = await trx.selectFrom("lands_lands").selectAll().where("ulid", "=", ulid).executeTakeFirst();

		if (!land) throw deleteLandError.raise("NOT_FOUND");

		const initiatorUuid = await playerService.getUUID(initiator);

		const members = safeJsonParse<{ [uuid: string]: { chunks: number } }>(land.members);
		if (!members.ok) throw deleteLandError.raise("INTERNAL_UNKNOWN");

		const isOwner = initiatorUuid in members.value;
		if (!isOwner) throw deleteLandError.raise("PERMISSION_DENIED");

		await trx.deleteFrom("lands_lands").where("ulid", "=", ulid).executeTakeFirstOrThrow();
	});

	return query;
}

const createLandRoute = new Elysia().use(defineRequiredUser()).post(
	"/create",
	async ({ body, nickname, status }) => {
		try {
			const data = await createLand(body, nickname);
			return { data };
		} catch (e) {
			const err = createLandError.reader(e);
			throw status(err.code, wrapError(err.msg));
		}
	},
	{
		body: createLandSchema,
		response: {
			200: withData(createLandSchemaPayload),
			500: withError(t.UnionEnum(createLandError.scopes[500])),
		},
		detail: {
			summary: buildRouteSummary("Create a land"),
		},
	},
);

const deleteLandRoute = new Elysia().use(defineRequiredUser()).delete(
	"/:ulid",
	async ({ nickname, status, params: { ulid } }) => {
		try {
			await deleteLand(ulid, nickname);
			return { data: "OK" };
		} catch (e) {
			const err = deleteLandError.reader(e);
			throw status(err.code, wrapError(err.msg));
		}
	},
	{
		response: {
			200: withData(t.Literal("OK")),
			500: withError(t.UnionEnum(deleteLandError.scopes[500])),
			403: withError(t.UnionEnum(deleteLandError.scopes[403])),
			404: withError(t.UnionEnum(deleteLandError.scopes[404])),
		},
		detail: {
			summary: buildRouteSummary("Delete a land"),
		},
	},
);

export const lands = new Elysia().group("/lands", (app) => app.use(createLandRoute).use(deleteLandRoute));
