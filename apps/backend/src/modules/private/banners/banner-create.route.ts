import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import Elysia from "elysia";
import { createAdminActivityLog } from "../private.model";
import { banner, createBannerSchema } from "./banner.model";

export const bannerCreate = new Elysia()
  .use(validatePermission(Permissions.get("BANNERS.CREATE")))
  .post("/create", async ({ body }) => {
    const data = await banner.create(body);
    return { data }
  }, {
    body: createBannerSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })