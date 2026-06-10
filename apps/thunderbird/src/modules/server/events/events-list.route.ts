import { redis } from "#/shared/redis/client";
import Elysia, { type Static, t } from "elysia";
import { eventPayload, EVENTS_ALL_KEY, EVENTS_TARGET_KEY, EVENTS_TYPE_KEY, eventTypeSchema } from "./events.model";
import { metaSchema, withData } from "#/shared/schemas";
import type { EventPayload } from "#/modules/private/events/events.model";
import { buildRouteSummary } from "#/utils";

const eventsListSchema = t.Composite([
  t.Required(t.Pick(metaSchema, ["limit"])),
  t.Object({
    type: t.Optional(eventTypeSchema)
  })
])

async function getEvents(
  { type, limit }: Static<typeof eventsListSchema>
): Promise<EventPayload[]> {
  const redisClient = redis.getInstance();

  async function getObjects(keys: string[]): Promise<EventPayload[]> {
    if (keys.length === 0) return [];

    const values = await redisClient.mget(keys);

    return values
      .filter((v): v is string => v !== null)
      .map(v => JSON.parse(v) as EventPayload);
  }

  let keys: string[] = []

  if (type) {
    const ids = await redisClient.zrevrange(EVENTS_TYPE_KEY(type), 0, 31);
    keys = ids.map(id => EVENTS_TARGET_KEY(id));
  } else {
    const ids = await redisClient.lrange(EVENTS_ALL_KEY, -limit, -1);
    keys = ids.map(id => EVENTS_TARGET_KEY(id));
  }

  return getObjects(keys);
}

const eventsPayloadSchema = t.Array(eventPayload);

export const eventsList = new Elysia()
  .get("/list", async ({ query }) => {
    const data = await getEvents(query);
    return { data }
  }, {
    query: eventsListSchema,
    response: {
      200: withData(eventsPayloadSchema)
    },
    detail: {
      summary: buildRouteSummary("List events")
    }
  })
