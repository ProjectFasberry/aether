import Elysia from "elysia"
import { bearer } from "@elysia/bearer"
import { general } from "../../shared/database/general-db"

export async function isValidApiKey(token: string): Promise<boolean> {
  const hash = new Bun.CryptoHasher("sha256")
    .update(token)
    .digest("hex")

  const query = await general
    .selectFrom("api_keys")
    .select("id")
    .where("key", "=", hash)
    .executeTakeFirst()

  return Boolean(query?.id)
}

export const requireApiKey = () => new Elysia({ name: "requireApiKey" })
  .use(bearer())
  .derive({ as: "scoped" }, async ({ bearer, status }) => {
    if (!bearer) throw status(401, { error: "UNAUTHORIZED" })

    const isValid = await isValidApiKey(bearer);
    if (!isValid) throw status(401, { error: "UNAUTHORIZED" })

    return { bearer }
  })
