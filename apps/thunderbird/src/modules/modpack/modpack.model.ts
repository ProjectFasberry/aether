import { DateTime } from "#/helpers/typebox";
import { general } from "#/shared/database/general-db";
import { t } from "elysia";

export const modpackPayloadSchema = t.Object({
	id: t.Number(),
	created_at: DateTime,
	name: t.String(),
	downloadLink: t.String(),
});

export async function getModpack(id: number) {
	const query = await general
		.selectFrom("modpacks")
		.select(["id", "created_at", "name", "downloadLink"])
		.where("id", "=", id)
		.executeTakeFirst();

	return query ?? null;
}
