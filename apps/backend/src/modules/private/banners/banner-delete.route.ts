import Elysia from "elysia";
import { bannerSchema } from "../../shared/banner/banner.model";
import { Permissions } from "#/shared/constants/permissions";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "../private.model";
import { banner } from "./banner.model";

export const bannerDelete = new Elysia()
  .use(validatePermission(Permissions.get("BANNERS.DELETE")))
  .delete("/:id", async ({ params: { id } }) => {
    const data = await banner.delete(id);
    return { data }
  }, {
    params: bannerSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })