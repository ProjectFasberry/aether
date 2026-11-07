import { general as generalDb } from "#/shared/database/general-db";
import { normalizeClientMod, serverContentSchema, serverRuntimeSchema } from "@repo/core/modules/status";
import { t } from "elysia";

export const catalogServerSchema = t.Object({
	id: t.String(),
	fullname: t.String(),
	available: t.Boolean(),
	excluded: t.Boolean(),
	runtime: serverRuntimeSchema,
	content: serverContentSchema,
	clientMod: t.Union([t.Literal("required"), t.Literal("optional")]),
});

export const catalogSchema = t.Object({
	default: t.Nullable(t.String()),
	servers: t.Record(t.String(), catalogServerSchema),
});

export type ServerCatalog = (typeof catalogSchema)["static"];

/**
 * Static per-server client runtime, read straight from the database.
 *
 * Unlike `/server/status`, this does not depend on the panel or the Redis
 * snapshot: the launcher needs the catalog even when every backend is down.
 * The default server is required to launch without an explicit selection.
 */
export async function getCatalog(): Promise<ServerCatalog> {
	const rows = await generalDb.selectFrom("servers").selectAll().orderBy("origin").execute();
	const servers: ServerCatalog["servers"] = {};

	for (const row of rows) {
		const id = row.origin.toLowerCase();

		servers[id] = {
			id,
			fullname: row.fullname,
			available: row.available,
			excluded: row.excluded,
			runtime: {
				minecraft: row.client_version,
				loader: row.loader,
				loaderVersion: row.loader_version,
				javaMajor: row.java_major,
			},
			content: { pack: row.resource_pack },
			clientMod: normalizeClientMod(row.client_mod),
		};
	}

	const ids = Object.keys(servers);
	const explicit = rows.find((row) => row.is_default)?.origin.toLowerCase() ?? null;
	const fallback = ids.includes("lobby") ? "lobby" : (ids[0] ?? null);

	return { default: explicit && servers[explicit] ? explicit : fallback, servers };
}
