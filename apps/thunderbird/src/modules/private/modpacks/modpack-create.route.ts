import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import Elysia, { type Static, t } from "elysia";
import { createAdminActivityLog } from "../private.model";
import { general } from "#/shared/database/general-db";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import { DateTime } from "#/helpers/typebox";
import { wrapError } from "@repo/shared/lib/helpers"

const modpackSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  downloadLink: t.String(),
  created_at: DateTime,
});

const modpackCreateSchema = t.Pick(modpackSchema, ["name", "downloadLink"]);

async function createModpack({
  name,
  downloadLink,
}: Static<typeof modpackCreateSchema>): Promise<Static<typeof modpackSchema>> {
  const query = await general
    .insertInto("modpacks")
    .values({
      name,
      downloadLink,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return query;
}

const MODRINTH_PREFIX = ["https://modrinth.com/modpack"];

export const modpackCreate = new Elysia()
  .use(validatePermission(permissionsService.get("MODPACKS.CREATE")))
  .post("/create", async ({ body, status }) => {
    if (!MODRINTH_PREFIX.some((prefix) => body.downloadLink.startsWith(prefix))) {
      throw status(400, wrapError("INVALID_LINK"));
    }

    const data = await createModpack(body).catch((e) => {
      throw status(500, wrapError(e));
    });

    return { data };
  }, {
    body: modpackCreateSchema,
    afterResponse: ({ permission, nickname }) => {
      createAdminActivityLog({ initiator: nickname, event: permission });
    },
    response: {
      200: withData(modpackSchema),
      400: withError(t.UnionEnum(["INVALID_LINK"])),
      500: withError(),
    },
    detail: {
      summary: buildRouteSummary("Create a modpack"),
    },
  });
