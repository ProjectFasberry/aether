import { invariant } from "#/helpers/invariant";
import dayjs from "dayjs";
import * as z from "zod/v4";

export const registrationsSchema = z.object({
  period: z.enum(["day", "month", "hour"]).optional().default("month"),
  day: z.number().optional().default(30)
}).superRefine((data, ctx) => {
  if (data.period === 'hour') {
    if (!data.day) {
      ctx.addIssue({
        path: ["day"], 
        code: "custom"
      })
    }
  }
})

type RecordItem = {
  id: string;
  created_at: number;
};

type ChartData = {
  label: string;
  registrations: number;
};

export function getChartData(
  records: RecordItem[],
  { period, day: targetDay }: z.infer<typeof registrationsSchema>
): ChartData[] {
  if (!records.length) return [];

  const days = 30;

  const grouped: Record<string, number> = {};

  records.forEach(record => {
    const dt = dayjs(record.created_at);
    let label: string;

    if (period === 'day') {
      label = dt.format('YYYY-MM-DD');
    } else if (period === 'month') {
      label = dt.format('YYYY-MM');
    } else { 
      if (!targetDay) return;
      const dayStart = dayjs(targetDay).startOf('day');
      if (!dt.isSame(dayStart, 'day')) return;
      label = dt.format('HH:00');
    }

    grouped[label] = (grouped[label] || 0) + 1;
  });

  const result: ChartData[] = [];

  if (period === 'day') {
    const end = dayjs().startOf('day'); 
    const start = end.subtract(days - 1, 'day'); 

    let current = start;

    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const label = current.format('YYYY-MM-DD');
      result.push({ label, registrations: grouped[label] || 0 });
      current = current.add(1, 'day');
    }
  } else if (period === 'month') {
    let start = dayjs(Math.min(...records.map(r => r.created_at))).startOf('month');
    const end = dayjs(Math.max(...records.map(r => r.created_at))).startOf('month');

    while (start.isBefore(end) || start.isSame(end, 'month')) {
      const label = start.format('YYYY-MM');
      result.push({ label, registrations: grouped[label] || 0 });
      start = start.add(1, 'month');
    }
  } else { 
    invariant(targetDay, 'For period === hour must be required the specific day')

    let start = dayjs(targetDay).startOf('day');
    
    const end = start.endOf('day');

    while (start.isBefore(end) || start.isSame(end, 'hour')) {
      const label = start.format('HH:00');
      result.push({ label, registrations: grouped[label] || 0 });
      start = start.add(1, 'hour');
    }
  }

  return result;
}