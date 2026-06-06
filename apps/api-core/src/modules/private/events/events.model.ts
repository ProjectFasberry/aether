import { EVENTS_ALL_KEY, EVENTS_TARGET_KEY, EVENTS_TYPE_KEY } from "#/modules/server/events/events.model";
import { redis } from "#/shared/redis/client";
import { invariant } from "#/utils";
import { type Static, t } from "elysia";

export const eventPayloadSchema = t.Object({
  id: t.String(),
  type: t.String(),
  title: t.String(),
  content: t.Object({
    created_at: t.String(),
    description: t.Nullable(t.String()),
    initiator: t.String()
  })
})
export type EventPayload = Static<typeof eventPayloadSchema>

export async function deleteEvent(id: string) {
  const redisClient = redis.getInstance();

  const eventStr = await redisClient.get(EVENTS_TARGET_KEY(id));
  if (!eventStr) return null;

  const event: EventPayload = JSON.parse(eventStr);
  const type = event.type;

  const results = await redisClient
    .multi()
    .del(EVENTS_TARGET_KEY(id))
    .lrem(EVENTS_ALL_KEY, 0, id)
    .srem(EVENTS_TYPE_KEY(type), id)
    .exec();

  invariant(results, 'Transaction failed')

  const [delRes, lremRes, sremRes]: [number, number, number] = results.map(([err, val]) => {
    if (err) throw err;
    return val;
  }) as [number, number, number];

  const success = delRes >= 0 && lremRes >= 0 && sremRes >= 0;
  invariant(success, "Event is not deleted")

  return id
}
