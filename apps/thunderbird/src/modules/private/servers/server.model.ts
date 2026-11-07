import { general } from "#/shared/database/general-db";
import { type Static, t } from "elysia";

export const serverSchema = t.Object({
	id: t.Number(),
	fullname: t.String(),
	description: t.Nullable(t.String()),
	thumbnail: t.String(),
	origin: t.String(),
	available: t.Boolean(),
	excluded: t.Boolean(),
	is_default: t.Boolean(),
	client_version: t.String(),
	client_mod: t.String(),
	java_major: t.Number(),
	loader: t.String(),
	loader_version: t.Nullable(t.String()),
	resource_pack: t.Nullable(t.String()),
});

export const serverListQuerySchema = t.Object({
	available: t.Optional(t.Boolean()),
	excluded: t.Optional(t.Boolean()),
});

export type ServerListQuery = Static<typeof serverListQuerySchema>;
export type ServerPayload = Static<typeof serverSchema>;

export async function getServers(query: ServerListQuery): Promise<ServerPayload[]> {
	let request = general
		.selectFrom("servers")
		.select([
			"id",
			"fullname",
			"description",
			"thumbnail",
			"origin",
			"available",
			"excluded",
			"is_default",
			"client_version",
			"client_mod",
			"java_major",
			"loader",
			"loader_version",
			"resource_pack",
		])
		.orderBy("id");

	if (query.available !== undefined) {
		request = request.where("available", "=", query.available);
	}

	if (query.excluded !== undefined) {
		request = request.where("excluded", "=", query.excluded);
	}

	return request.execute();
}

export async function getServer(id: number): Promise<ServerPayload | undefined> {
	return general
		.selectFrom("servers")
		.select([
			"id",
			"fullname",
			"description",
			"thumbnail",
			"origin",
			"available",
			"excluded",
			"is_default",
			"client_version",
			"client_mod",
			"java_major",
			"loader",
			"loader_version",
			"resource_pack",
		])
		.where("id", "=", id)
		.executeTakeFirst();
}
