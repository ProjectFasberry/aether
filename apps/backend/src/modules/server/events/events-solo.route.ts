import Elysia, { t } from "elysia";
import { eventPayload, getEvent } from "./events.model";
import { withData } from "#/shared/schemas";

export const eventsSolo = new Elysia()
  .get("/:id", async ({ params: { id } }) => {
    const data = await getEvent(id)
    return { data }
  }, {
    response: {
      200: withData(
        t.Nullable(eventPayload)
      )
    }
  })