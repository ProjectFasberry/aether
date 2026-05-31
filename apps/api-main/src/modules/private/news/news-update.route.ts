import Elysia, { t } from "elysia";
import type * as z from "zod";
import { general } from "#/shared/database/general-db";
import { Permissions } from "#/shared/constants/permissions";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "../private.model";
import type { Selectable } from "kysely";
import { newsUpdateSchema } from "@repo/shared/schemas/news";
import { buildUpdates } from "#/utils/config/transforms";
import type { DB } from "@repo/shared/types/db/general";
import { withData } from "#/shared/schemas";

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
	.post("/:id/edit", async ({ params: { id }, body }) => {
		const data = await updateNews(id, body);
		return { data }
	}, {
		params: t.Object({ id: t.Number() }),
		body: newsUpdateSchema,
		afterResponse: ({ nickname: initiator, permission }) => {
			createAdminActivityLog({ initiator, event: permission });
    },
    response: {
      200: withData(
        t.Record(t.String(), t.Union([t.String(), t.Any(), t.Boolean()]))
      )
		}
	});
