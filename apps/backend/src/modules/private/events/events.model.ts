import { invariant } from "#/helpers/invariant";
import { EVENTS_ALL_KEY, EVENTS_TARGET_KEY, EVENTS_TYPE_KEY } from "#/modules/server/events/events.model";
import { getRedis } from "#/shared/redis/client";
import type { EventPayload } from "@repo/shared/types/entities/other";

export async function deleteEvent(id: string) {
  const redis = getRedis();

  const eventStr = await redis.get(EVENTS_TARGET_KEY(id));
  if (!eventStr) return false;

  const event: EventPayload = JSON.parse(eventStr);
  const type = event.type;

  const results = await redis
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