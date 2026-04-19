import Elysia from "elysia";
import z from "zod";
import { general } from "#/shared/database/general-db";
import { Permissions } from "#/shared/constants/permissions";
import { validatePermission } from "#/lib/middlewares/validators";
import { createAdminActivityLog } from "../private.model";
import type { Selectable } from "kysely";
import type { News } from "@repo/shared/types/db/general-database-types";
import { newsUpdateSchema } from "@repo/shared/schemas/news";
import { buildUpdates } from "#/utils/config/transforms";

async function updateNews(id: number, values: z.infer<typeof newsUpdateSchema>) {
	const updates = buildUpdates<Selectable<News>>(values);
	const fields = values.map((o) => o.field);

	const query = await general
		.updateTable("news")
		.set(updates)
		.where("id", "=", id)
		.returning(fields)
		.executeTakeFirstOrThrow();

	return query;
}

export const newsUpdateRoute = new Elysia().use(validatePermission(Permissions.get("NEWS.UPDATE"))).post(
	"/:id/edit",
	async ({ params: { id }, status, body }) => {
		const data = await updateNews(id, body);
		return { data }
	},
	{
		params: z.object({ id: z.coerce.number() }),
		body: newsUpdateSchema,
		afterResponse: ({ nickname: initiator, permission }) => {
			createAdminActivityLog({ initiator, event: permission });
		},
	},
);
