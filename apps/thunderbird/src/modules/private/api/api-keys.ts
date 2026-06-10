import { DateTime } from "#/helpers/typebox";
import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import Elysia, { type Static, t } from "elysia";
import { nanoid } from "nanoid";

const DEFAULT_DURATION = 2592000; // 30d;

const apiKeySchema = t.Object({
  id: t.Number(),
  description: t.Nullable(t.String()),
  duration: t.Number(),
  created_at: DateTime,
});

const createApiKeySchema = t.Composite([
  t.Object({
    duration: t.Optional(t.Number()),
    description: t.Optional(t.String()),
  }),
]);

const createApiKeyPayloadSchema = t.Composite([
  t.Pick(apiKeySchema, ["id", "description", "duration", "created_at"]),
  t.Object({
    rawKey: t.String(),
    key: t.String(),
  }),
]);

async function createApiKey(
  args: Static<typeof createApiKeySchema>,
): Promise<Static<typeof createApiKeyPayloadSchema>> {
  const { description, duration } = args;

  const rawKey = nanoid(32);
  const key = new Bun.CryptoHasher("sha256").update(rawKey).digest("hex");

  const query = await general
    .insertInto("api_keys")
    .values({
      key,
      description: description ?? null,
      duration,
    })
    .returning(["created_at", "id", "duration", "description", "key"])
    .executeTakeFirstOrThrow();

  return {
    ...query,
    duration: query.duration ?? DEFAULT_DURATION,
    rawKey,
  };
}

async function getApiKeyList(): Promise<Static<typeof apiKeySchema>[]> {
  const query = await general
    .selectFrom("api_keys")
    .select(["id", "duration", "created_at", "description"])
    .limit(32)
    .execute();

  const data = query.map((k) => ({
    ...k,
    duration: k.duration ?? DEFAULT_DURATION,
  }));

  return data;
}

const createApiKeyRoute = new Elysia()
  .use(validatePermission(permissions.get("API.KEYS.CONTROL"), { withExternal: true }))
  .post("/create", async ({ body }) => {
    const data = await createApiKey(body);
    return { data };
  }, {
    body: createApiKeySchema,
    response: {
      200: withData(createApiKeyPayloadSchema),
      500: withError(),
    },
    detail: {
      summary: buildRouteSummary("Create an API key", { tags: ["withExternal"] }),
    },
  });

const listApiKeyRoute = new Elysia()
  .use(validatePermission(permissions.get("API.KEYS.LIST"), { withExternal: true }))
  .get("/list", async ({ query }) => {
    const data = await getApiKeyList();
    return { data };
  }, {
    response: {
      200: withData(t.Array(apiKeySchema)),
    },
    detail: {
      summary: buildRouteSummary("List all API keys", { tags: ["withExternal"] }),
    },
    // TODO: add cursor-based pagination
    // query: t.Object({
    // })
  });

const deleteApiKeyRoute = new Elysia()
  .use(validatePermission(permissions.get("API.KEYS.CONTROL"), { withExternal: true }))
  .delete("/:id", async ({ params: { id } }) => {
    await general.deleteFrom("api_keys").where("id", "=", id).execute();
    return { data: "OK" };
  }, {
    params: t.Object({
      id: t.Number(),
    }),
    response: {
      200: withData(t.Literal("OK")),
      500: withError(),
    },
    detail: {
      summary: buildRouteSummary("Delete an API key", { tags: ["withExternal"] }),
    },
  });

export const apiKeys = new Elysia()
  .group("/keys", app => app
    .use(createApiKeyRoute)
    .use(listApiKeyRoute)
    .use(deleteApiKeyRoute)
  );
