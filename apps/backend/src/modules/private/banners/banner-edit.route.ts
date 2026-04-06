import { general } from "#/shared/database/general-db";
import { buildUpdates } from "#/utils/config/transforms";
import type { Banners } from "@repo/shared/types/db/general-database-types";
import Elysia from "elysia";
import type { Selectable } from "kysely";
import z from "zod";

const bannerEditSchema = z.array(
	z.object({
		field: z.enum(["title", "description"]),
		value: z.union([z.string()]),
	}),
);

async function updateBanner(id: number, values: z.infer<typeof bannerEditSchema>) {
	const updates = buildUpdates<Selectable<Banners>>(values);
	const keys = values.map((o) => o.field);

	const query = await general
		.updateTable("banners")
		.set(updates)
		.where("id", "=", id)
		.returning(keys)
		.executeTakeFirstOrThrow();

	return query;
}

export const bannerEdit = new Elysia().post(
	"/:id/edit",
	async ({ params, body }) => {
		const id = params.id;
		const data = await updateBanner(id, body);
		return { data };
	},
	{
		body: bannerEditSchema,
		params: z.object({ id: z.coerce.number() }),
	},
);
