import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia, { t } from "elysia";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

async function deleteModpack(id: number) {
	return await general.deleteFrom("modpacks").where("id", "=", id).returning("id").executeTakeFirstOrThrow();
}

export const modpackDelete = new Elysia()
  .use(validatePermission(permissions.get("MODPACKS.DELETE")))
  .delete("/:id", async ({ params: { id } }) => {
    await deleteModpack(id);
    return { data: "OK" };
  }, {
    params: t.Object({ id: t.Number() }),
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission });
    },
    response: {
      200: withData(t.Literal("OK")),
    },
    detail: {
      summary: buildRouteSummary("Delete a modpack"),
    },
  });
