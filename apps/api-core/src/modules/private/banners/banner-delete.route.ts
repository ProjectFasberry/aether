import Elysia, { t } from "elysia";
import { bannerSchema } from "../../banner/banner.model";
import { permissions } from "#/shared/constants/permissions";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "../private.model";
import { banner } from "./banner.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

export const bannerDelete = new Elysia()
  .use(validatePermission(permissions.get("BANNERS.DELETE")))
  .delete("/:id", async ({ params: { id } }) => {
    await banner.delete(id);
    return { data: "OK" }
  }, {
    params: bannerSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    },
    response: {
      200: withData(
        t.Literal("OK")
      )
    },
    detail: {
      summary: buildRouteSummary("Delete a banner")
		}
  })
