import { validatePermission } from "#/lib/middlewares/validators";
import { Permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia from "elysia";
import z from "zod";
import { createAdminActivityLog } from "../private.model";

const createBannerSchema = z.object({
  title: z.string(),
  description: z.string().transform((v) => v.trim() || undefined).optional(),
  href: z.object({
    title: z.string(),
    value: z.url()
  })
})

async function createBanner({ title, description, href }: z.infer<typeof createBannerSchema>) {
  const query = await general
    .insertInto("banners")
    .values({
      title,
      description,
      href_title: href.title,
      href_value: href.value
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  const { href_title, href_value, ...base } = query

  return {
    ...base,
    href: {
      title: href_title,
      value: href_value
    }
  };
}

export const bannerCreate = new Elysia()
  .use(validatePermission(Permissions.get("BANNERS.CREATE")))
  .post("/create", async ({ status, body }) => {
    const data = await createBanner(body);
    return { data }
  }, {
    body: createBannerSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })