import Elysia from "elysia";
import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";
import { deleteEvent } from "./events.model";

export const eventsDelete = new Elysia()
  .use(validatePermission(Permissions.get("EVENTS.DELETE")))
  .delete("/:id", async ({ params: { id } }) => {
    const data = await deleteEvent(id)
    return { data }
  }, {
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })