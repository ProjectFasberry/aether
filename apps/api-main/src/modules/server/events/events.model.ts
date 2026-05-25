import { getRedisKey } from "#/helpers/redis"
import type { EventPayload } from "#/modules/private/events/events.model"
import { getRedis } from "#/shared/redis/client"
import { type Static, t } from "elysia"
import { nanoid } from "nanoid"

export const EVENTS_ALL_KEY = getRedisKey("internal", "events:all:data")
export const EVENTS_TARGET_KEY = (id: string) => getRedisKey("internal", `events:event:${id}`)
export const EVENTS_TYPE_KEY = (type: string) => getRedisKey("internal", `events:type:${type}`)

export const eventTypeSchema = t.UnionEnum(["game", "log", "system"])

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

export const createEventSchema = t.Object({
  type: eventTypeSchema,
  title: t.String({ minLength: 1, maxLength: 64 }),
  initiator: t.String({ minLength: 1, maxLength: 32 }),
  description: t.Transform(
    t.Nullable(t.String({ maxLength: 128 }), { default: null })
  )
    .Decode((v) => {
      if (v === null) return null;
      return v.trim().length === 0 ? null : v;
    })
    .Encode((v) => v)
});

export async function createEvent(
  { title, type, initiator, description }: Static<typeof createEventSchema>
) {
  const redis = getRedis();

  const event: EventPayload = {
    id: nanoid(8),
    title,
    type,
    content: {
      initiator,
      description,
      created_at: new Date().toISOString(),
    }
  }

  const ttl = 60 * 60 * 24 * 30

  const results = await redis
    .multi()
    .set(EVENTS_TARGET_KEY(event.id), JSON.stringify(event), 'EX', ttl)
    .rpush(EVENTS_ALL_KEY, event.id)
    .zadd(EVENTS_TYPE_KEY(type), Date.now(), event.id)
    .exec();

  if (!results) throw new Error('Transaction failed');

  const [setRes, rpushRes, saddRes]: [string, number, number] = results.map(([err, val]) => {
    if (err) throw err;
    return val;
  }) as [string, number, number];

  const success = setRes === 'OK' && rpushRes >= 1 && saddRes >= 0;
  if (!success) throw new Error("Event is not created")

  return event
}

export async function cleanOldEvents(bs = 100) {
  const redis = getRedis();
  const types = eventTypeSchema.enum

  for (const type of types) {
    let start = 0;

    while (true) {
      const ids = await redis.zrange(EVENTS_TYPE_KEY(type), start, start + bs - 1);
      if (!ids.length) break;

      for (const id of ids) {
        const exists = await redis.exists(EVENTS_TARGET_KEY(id));

        if (!exists) {
          await redis.zrem(EVENTS_TYPE_KEY(type), id);
        }
      }

      if (ids.length < bs) break;
      start += bs;
    }
  }

  let start = 0;

  while (true) {
    const allIds = await redis.lrange(EVENTS_ALL_KEY, start, start + bs - 1);
    if (!allIds.length) break;

    for (const id of allIds) {
      const exists = await redis.exists(EVENTS_TARGET_KEY(id));

      if (!exists) {
        await redis.lrem(EVENTS_ALL_KEY, 0, id);
      }
    }

    if (allIds.length < bs) break;
    start += bs;
  }
}

export async function getEvent(id: string): Promise<EventPayload | null> {
  const redis = getRedis();

  const eventStr = await redis.get(EVENTS_TARGET_KEY(id));
  if (!eventStr) return null;

  const event = JSON.parse(eventStr);
  return event;
}
