import Elysia, { t } from "elysia";
import { permissionsService } from "#/shared/constants/permissions";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "../private.model";
import { newsUpdateSchema } from "@repo/shared/schemas/news";
import { withData } from "#/shared/schemas";
import { newsSingleExtendedSchema, updateNews } from "./news.model";
import { buildRouteSummary } from "#/utils";

export const newsUpdateRoute = new Elysia()
  .use(validatePermission(permissionsService.get("NEWS.UPDATE")))
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
