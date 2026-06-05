import Elysia, { t } from "elysia";
import { Permissions } from "#/shared/constants/permissions";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "../private.model";
import { newsUpdateSchema } from "@repo/shared/schemas/news";
import { withData } from "#/shared/schemas";
import { newsSingleExtendedSchema, updateNews } from "./news.model";

export const newsUpdateRoute = new Elysia()
	.use(validatePermission(Permissions.get("NEWS.UPDATE")))
	.post("/:id/edit", async ({ params: { id }, body }) => {
		const data = await updateNews(id, body);
		return { data }
	}, {
    params: t.Object({
      id: t.Number()
    }),
		body: newsUpdateSchema,
		afterResponse: ({ nickname: initiator, permission }) => {
			createAdminActivityLog({ initiator, event: permission });
    },
    response: {
      200: withData(newsSingleExtendedSchema)
		}
	});
