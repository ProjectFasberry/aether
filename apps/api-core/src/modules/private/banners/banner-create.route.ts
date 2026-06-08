import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import Elysia from "elysia";
import { createAdminActivityLog } from "../private.model";
import { banner, createBannerPayloadSchema, createBannerSchema } from "./banner.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

export const bannerCreate = new Elysia()
  .use(validatePermission(permissions.get("BANNERS.CREATE")))
  .post("/create", async ({ body }) => {
    const data = await banner.create(body);
    return { data }
  }, {
    body: createBannerSchema,
    afterResponse: ({ permission, nickname }) => {
      createAdminActivityLog({ initiator: nickname, event: permission })
    },
    response: {
      200: withData(
        createBannerPayloadSchema
      )
    },
    detail: {
      summary: buildRouteSummary("Create a banner")
    },
  })
