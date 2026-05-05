import { createNewsSchema } from '@repo/shared/schemas/news';
import Elysia from "elysia"
import type * as z from "zod/v4"
import { general } from "#/shared/database/general-db"
import { getStaticUrl } from "#/helpers/volume"
import { validatePermission } from '#/lib/validators';
import { Permissions } from '#/shared/constants/permissions';
import { createAdminActivityLog } from '../private.model';

async function createNews(
  { title, description, content, imageUrl }: z.infer<typeof createNewsSchema>, 
  creator: string
) {
  const query = await general
    .insertInto("news")
    .values({ title, description, imageUrl, content, creator })
    .returningAll()
    .executeTakeFirstOrThrow()

  return {
    ...query,
    imageUrl: getStaticUrl(query.imageUrl)
  }
}

export const newsCreateRoute = new Elysia()
  .use(validatePermission(Permissions.get("NEWS.CREATE")))
  .post("/create", async ({ status, body, nickname }) => {
    const data = await createNews(body, nickname);
    return { data }
  }, {
    body: createNewsSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })