import { createNewsSchema } from '@repo/shared/schemas/news';
import Elysia, { type Static, t } from "elysia"
import type * as z from "zod"
import { general } from "#/shared/database/general-db"
import { getStaticUrl } from "#/helpers/volume"
import { validatePermission } from '#/lib/validators';
import { Permissions } from '#/shared/constants/permissions';
import { createAdminActivityLog } from '../private.model';
import { withData } from '#/shared/schemas';

const newsSchema = t.Object({
  id: t.Number(),
  imageUrl: t.String(),
  created_at: t.String(),
  title: t.String(),
  description: t.String(),
  content: t.Any(),
  creator: t.String(),
})

async function createNews(
  { title, description, content, imageUrl }: z.infer<typeof createNewsSchema>,
  creator: string
): Promise<Static<typeof newsSchema>> {
  const query = await general
    .insertInto("news")
    .values({ title, description, imageUrl, content, creator })
    .returningAll()
    .executeTakeFirstOrThrow()

  return {
    ...query,
    created_at: query.created_at.toString(),
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
    },
    response: {
      200: withData(
        newsSchema
      )
    }
  })
