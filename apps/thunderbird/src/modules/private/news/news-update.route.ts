import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "../private.model";
import { newsUpdateSchema } from "@repo/shared/schemas/news";
import { withData } from "#/shared/schemas";
import { newsSingleExtendedSchema, updateNews } from "./news.model";
import { buildRouteSummary } from "#/lib/routes";

export const newsUpdateRoute = new Elysia()
  .use(validatePermission("news.update"))
  .post("/:id/edit", async ({ params: { id }, body }) => {
    const data = await updateNews(id, body);
    return { data };
  }, {
    params: t.Object({
      id: t.Number(),
    }),
    body: newsUpdateSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission });
    },
    response: {
      200: withData(newsSingleExtendedSchema),
    },
    detail: {
      summary: buildRouteSummary("Update a news article"),
    },
  });
