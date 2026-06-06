import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import Elysia, { t } from "elysia";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";
import { deleteNews } from "./news.model";

export const newsDeleteRoute = new Elysia()
  .use(validatePermission(Permissions.get("NEWS.DELETE")))
  .delete("/:id", async ({ params: { id } }) => {
    await deleteNews(id);
    return { data: "OK" }
  }, {
    params: t.Object({ id: t.Number() }),
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    },
    response: {
      200: withData(
        t.Literal("OK")
      )
    }
  })
