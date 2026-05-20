import Elysia, { t } from "elysia";
import { bannerSchema } from "../../shared/banner/banner.model";
import { Permissions } from "#/shared/constants/permissions";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "../private.model";
import { banner } from "./banner.model";
import { withData } from "#/shared/schemas";

export const bannerDelete = new Elysia()
  .use(validatePermission(Permissions.get("BANNERS.DELETE")))
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
    }
  })
