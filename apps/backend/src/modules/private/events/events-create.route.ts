import Elysia from "elysia"
import { createEvent, createEventSchema } from "../../server/events/events.model";
import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";

export const eventsCreate = new Elysia()
  .use(validatePermission(Permissions.get("EVENTS.CREATE")))
  .post("/create", async ({ body }) => {
    const data = await createEvent(body)
    return { data }
  }, {
    body: createEventSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    }
  })