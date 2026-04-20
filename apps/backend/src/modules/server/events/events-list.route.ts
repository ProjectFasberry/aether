import { getRedis } from "#/shared/redis/init";
import type { EventPayload } from "@repo/shared/types/entities/other";
import Elysia, { t } from "elysia";
import * as z from "zod/v4";
import { EVENTS_ALL_KEY, EVENTS_TARGET_KEY, EVENTS_TYPE_KEY, eventTypeSchema } from "./events.model";
import { metaSchema, withData } from "#/shared/schemas";

const eventsListSchema = z.intersection(
  metaSchema.pick({ limit: true }),
  z.object({
    type: eventTypeSchema.optional()
  })
)

async function getEvents(
  { type, limit }: z.infer<typeof eventsListSchema>
): Promise<EventPayload[]> {
  const redis = getRedis();

  async function getObjects(keys: string[]): Promise<EventPayload[]> {
    if (keys.length === 0) return [];

    const values = await redis.mget(keys);

    return values
      .filter((v): v is string => v !== null)
      .map(v => JSON.parse(v) as EventPayload);
  }

  let keys: string[] = []

  if (type) {
    const ids = await redis.zrevrange(EVENTS_TYPE_KEY(type), 0, 31);
    keys = ids.map(id => EVENTS_TARGET_KEY(id));
  } else {
    const ids = await redis.lrange(EVENTS_ALL_KEY, -limit, -1);
    keys = ids.map(id => EVENTS_TARGET_KEY(id));
  }

  return getObjects(keys);
}

export const eventPayload = t.Object({
  id: t.String(),
  type: t.String(),
  title: t.String(),
  content: t.Object({
    created_at: t.Union([t.String(), t.Date()]),
    description: t.Nullable(t.String()),
    initiator: t.String(),
  })
})

export const eventsList = new Elysia()
  .model({
    "events-list": withData(
      t.Array(
        eventPayload
      )
    )
  })
  .get("/list", async ({ query }) => {
    const data = await getEvents(query);
    return { data }
  }, {
    query: eventsListSchema,
    response: {
      200: "events-list"
    }
  })