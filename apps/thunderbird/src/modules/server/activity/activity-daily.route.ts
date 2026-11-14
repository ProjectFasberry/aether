import Elysia, { t } from "elysia";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { getPlayerHeatmap } from "./activity-summary.route";

dayjs.extend(utc);

const DEFAULT_DAYS = 365;
const MIN_DAYS = 7;
const MAX_DAYS = 365;

export type PlayerActivityDay = {
  date: string;
  minutes: number;
};

export type PlayerActivityDailyPayload = {
  days: PlayerActivityDay[];
  totalMinutes: number;
  activeDays: number;
};

const activityDailyPayload = t.Object({
  days: t.Array(
    t.Object({
      date: t.String(),
      minutes: t.Number(),
    }),
  ),
  totalMinutes: t.Number(),
  activeDays: t.Number(),
});

export const activityDaily = new Elysia()
  .get("/daily/:nickname", async ({ params: { nickname }, query }) => {
    const requested = Number(query.days ?? DEFAULT_DAYS);
    const days = Number.isFinite(requested)
      ? Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.trunc(requested)))
      : DEFAULT_DAYS;

    const now = dayjs.utc();
    const from = now.startOf("day").subtract(days - 1, "day");
    const heatmap = await getPlayerHeatmap(nickname, {
      from: from.toDate(),
      to: now.toDate(),
    });

    const totals = new Map<string, number>();

    for (const [date, hours] of heatmap) {
      let minutes = 0;

      for (const value of hours.values()) minutes += value;

      totals.set(date, minutes);
    }

    const data: PlayerActivityDay[] = [];
    let totalMinutes = 0;
    let activeDays = 0;

    for (let index = 0; index < days; index++) {
      const date = from.add(index, "day").format("YYYY-MM-DD");
      const minutes = totals.get(date) ?? 0;

      data.push({ date, minutes });
      totalMinutes += minutes;

      if (minutes > 0) activeDays++;
    }

    return { data: { days: data, totalMinutes, activeDays } };
  }, {
    query: t.Object({
      days: t.Optional(t.String()),
    }),
    response: {
      200: withData(activityDailyPayload),
    },
    detail: {
      summary: buildRouteSummary("Get daily player activity"),
      description: "Returns one UTC day per entry for the last ?days=7..365 (default 365).",
    },
  });
