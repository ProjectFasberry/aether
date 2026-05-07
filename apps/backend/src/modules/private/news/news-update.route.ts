import Elysia from "elysia";
import * as z from "zod";
import { general } from "#/shared/database/general-db";
import { Permissions } from "#/shared/constants/permissions";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "../private.model";
import type { Selectable } from "kysely";
import { newsUpdateSchema } from "@repo/shared/schemas/news";
import { buildUpdates } from "#/utils/config/transforms";
import type { DB } from "@repo/shared/types/db/general-database-types";

async function updateNews(id: number, values: z.infer<typeof newsUpdateSchema>) {
	const updates = buildUpdates<Selectable<DB["news"]>>(values);
	const fields = values.map((o) => o.field);

	const query = await general
		.updateTable("news")
		.set(updates)
		.where("id", "=", id)
		.returning(fields)
		.executeTakeFirstOrThrow();

	return query;
}

export const newsUpdateRoute = new Elysia()
	.use(validatePermission(Permissions.get("NEWS.UPDATE")))
	.post("/:id/edit", async ({ params: { id }, status, body }) => {
		const data = await updateNews(id, body);
		return { data }
	}, {
		params: z.object({ id: z.coerce.number() }),
		body: newsUpdateSchema,
		afterResponse: ({ nickname: initiator, permission }) => {
			createAdminActivityLog({ initiator, event: permission });
		},
	});