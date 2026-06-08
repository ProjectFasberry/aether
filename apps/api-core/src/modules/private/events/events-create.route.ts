import Elysia from "elysia"
import { createEvent, createEventSchema } from "../../server/events/events.model";
import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";
import { eventPayloadSchema } from "./events.model";
import { buildRouteSummary } from "#/utils";

export const eventsCreate = new Elysia()
  .use(validatePermission(permissions.get("EVENTS.CREATE")))
  .post("/create", async ({ body }) => {
    const data = await createEvent(body)
    return { data }
  }, {
    body: createEventSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission })
    },
    response: {
      200: withData(
        eventPayloadSchema
      )
    },
    detail: {
      summary: buildRouteSummary("Create an event")
    },
  })
