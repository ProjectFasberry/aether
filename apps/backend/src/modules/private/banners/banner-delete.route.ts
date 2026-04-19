import Elysia from "elysia";
import { general } from "#/shared/database/general-db";
import { bannerSchema } from "../../shared/banner/banner.model";
import { Permissions } from "#/shared/constants/permissions";
import { validatePermission } from "#/lib/middlewares/validators";
import { createAdminActivityLog } from "../private.model";

async function deleteBanner(id: number) {
  const query = await general
    .deleteFrom("banners")
    .where("id", "=", id)
    .returning(["id"])
    .executeTakeFirst()

  return query;
}

export const bannerDelete = new Elysia()
  .use(validatePermission(Permissions.get("BANNERS.DELETE")))
  .delete("/:id", async ({ status, params }) => {
    const id = params.id;
    const data = await deleteBanner(id);
    return { data }
  }, {
    params: bannerSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })