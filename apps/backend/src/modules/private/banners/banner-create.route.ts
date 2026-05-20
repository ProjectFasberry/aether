import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import Elysia from "elysia";
import { createAdminActivityLog } from "../private.model";
import { banner, createBannerPayloadSchema, createBannerSchema } from "./banner.model";
import { withData } from "#/shared/schemas";

export const bannerCreate = new Elysia()
  .use(validatePermission(Permissions.get("BANNERS.CREATE")))
  .post("/create", async ({ body }) => {
    const data = await banner.create(body);
    return { data }
  }, {
    body: createBannerSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    },
    response: {
      200: withData(
        createBannerPayloadSchema
      )
    }
  })
