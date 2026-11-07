import { DateTime } from "#/helpers/typebox";
import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import Elysia, { type Static, t } from "elysia";
import { nanoid } from "nanoid";

const DEFAULT_DURATION = 2592000; // 30d;
/** `api_keys` gained description/duration after the generated DB type. */
const db = general as any;

const apiKeySchema = t.Object({
  id: t.Number(),
  description: t.Nullable(t.String()),
  duration: t.Nullable(t.Number()),
  created_at: DateTime,
});

const createApiKeySchema = t.Composite([
  t.Object({
    duration: t.Optional(t.Integer({ minimum: 60, maximum: 315_360_000 })),
    description: t.Optional(t.String({ maxLength: 200 })),
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
  nickname: string,
): Promise<Static<typeof createApiKeyPayloadSchema>> {
  const { description, duration } = args;

  const rawKey = nanoid(32);
  const key = new Bun.CryptoHasher("sha256").update(rawKey).digest("hex");

  const query = await db
    .insertInto("api_keys")
    .values({
      key,
      nickname,
      description: description ?? null,
      duration: duration ?? DEFAULT_DURATION,
    })
    .returning(["created_at", "id", "duration", "description", "key"])
    .executeTakeFirstOrThrow();

  return {
    ...query,
    rawKey,
  };
}

async function getApiKeyList(): Promise<Static<typeof apiKeySchema>[]> {
  return await db
    .selectFrom("api_keys")
    .select(["id", "duration", "created_at", "description"])
    .orderBy("created_at", "desc")
    .limit(32)
    .execute();
}

const createApiKeyRoute = new Elysia()
  .use(validatePermission(permissionsService.get("API.KEYS.CONTROL")))
  .post("/create", async (ctx) => {
    const nickname = "nickname" in ctx ? String(ctx.nickname) : "api";
    const data = await createApiKey(ctx.body, nickname);
    return { data };
  }, {
    body: createApiKeySchema,
    response: {
      200: withData(createApiKeyPayloadSchema),
      500: withError(),
    },
    detail: {
      summary: buildRouteSummary("Create an API key"),
    },
  });

const listApiKeyRoute = new Elysia()
  .use(validatePermission(permissionsService.get("API.KEYS.LIST")))
  .get("/list", async ({ query }) => {
    const data = await getApiKeyList();
    return { data };
  }, {
    response: {
      200: withData(t.Array(apiKeySchema)),
    },
    detail: {
      summary: buildRouteSummary("List all API keys"),
    },
    // TODO: add cursor-based pagination
    // query: t.Object({
    // })
  });

const deleteApiKeyRoute = new Elysia()
  .use(validatePermission(permissionsService.get("API.KEYS.CONTROL")))
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
      summary: buildRouteSummary("Delete an API key"),
    },
  });

export const apiKeys = new Elysia()
  .group("/keys", app => app
    .use(createApiKeyRoute)
    .use(listApiKeyRoute)
    .use(deleteApiKeyRoute)
  );
