import Elysia, { t } from 'elysia';
import { general } from '#/shared/database/general-db';
import dayjs from 'dayjs';
import { withData } from '#/shared/schemas';

export type PlayerActivitySummaryPayload = {
  [k: string]: {
    [k: string]: number;
  };
};

type Heatmap = Map<string, Map<number, number>>;

async function getPlayerHeatmap(
  nickname: string,
  { from, to }: { from?: Date, to?: Date } = {}
): Promise<Heatmap> {
  const now = dayjs();

  const fromDate = from ? dayjs(from) : now.subtract(1, "month");
  const toDate = to ? dayjs(to) : now.add(1, "month");

  const rows = await general
    .selectFrom('activity_users')
    .select(['event', 'type'])
    .where('nickname', '=', nickname)
    .where('event', '>=', fromDate.toDate())
    .where('event', '<', toDate.toDate())
    .orderBy('event', 'asc')
    .execute();

  const heatmap: Heatmap = new Map();

  if (rows.length === 0) return heatmap;

  for (let i = 0; i < rows.length; i++) {
    const e = rows[i];

    if (e.type !== 'join') continue;

    const start = new Date(e.event);
    const quitEvent = rows.slice(i + 1).find(ev => ev.type === 'quit');
    const end = quitEvent ? new Date(quitEvent.event) : new Date();

    if (end <= start) {
      const dateKey = start.toISOString().split('T')[0];
      const hour = start.getUTCHours();

      if (!heatmap.has(dateKey)) heatmap.set(dateKey, new Map());

      heatmap.get(dateKey)!.set(hour, (heatmap.get(dateKey)!.get(hour) || 0) + 1);

      continue;
    }

    const cursor = new Date(start);

    while (cursor < end) {
      const dateKey = cursor.toISOString().split('T')[0];
      const hour = cursor.getUTCHours();

      const nextHour = new Date(cursor);
      nextHour.setUTCHours(hour + 1, 0, 0, 0);

      const segmentEnd = nextHour < end ? nextHour : end;

      const minutes = Math.max(
        1,
        Math.ceil((segmentEnd.getTime() - cursor.getTime()) / 60000)
      );

      if (!heatmap.has(dateKey)) heatmap.set(dateKey, new Map());
      heatmap.get(dateKey)!.set(hour, (heatmap.get(dateKey)!.get(hour) || 0) + minutes);

      cursor.setTime(segmentEnd.getTime());
    }
  }

  return heatmap;
}

const activitySummaryPayload = t.Record(
  t.String(),
  t.Record(t.String(), t.Number())
)

export const activitySummary = new Elysia()
  .get("/summary/:nickname", async ({ params: { nickname } }) => {
    const payload = await getPlayerHeatmap(nickname);

    let data: PlayerActivitySummaryPayload | null = Object.fromEntries(
      Array.from(payload.entries()).map(([date, hours]) => [
        date,
        Object.fromEntries(hours),
      ])
    );

    if (Object.entries(data).length === 0) {
      data = null;
    }

    return { data }
  }, {
    response: {
      200: withData(
        t.Nullable(activitySummaryPayload)
      )
    }
  })