import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";
import { deleteEvent } from "./events.model";
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "@repo/shared/lib/helpers";
import { buildRouteSummary } from "#/utils";

export const eventsDelete = new Elysia()
  .use(validatePermission(permissionsService.get("EVENTS.DELETE")))
  .delete("/:id", async ({ params: { id }, status }) => {
    const data = await deleteEvent(id);
    if (!data) return status(404, wrapError("ITEM_NOT_FOUND"));
    return { data: "OK" };
  }, {
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission });
    },
    response: {
      200: withData(t.Literal("OK")),
      404: withError(t.UnionEnum(["ITEM_NOT_FOUND"])),
    },
    detail: {
      summary: buildRouteSummary("Delete an event"),
    },
  });
