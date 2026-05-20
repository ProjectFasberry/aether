import { client } from '@/shared/lib/client-wrapper'
import { atom, onConnect, reatomAsync, reatomMap, sleep, withDataAtom, withRetry, type AtomState } from '@reatom/framework'
import { reatomComponent, useUpdate } from '@reatom/npm-react'
import { Skeleton } from '@repo/ui/skeleton';
import { useMemo } from 'react';

const formatBytesToMB = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 MB';
  return `${parseFloat((bytes / (1024 * 1024)).toFixed(decimals))} MB`;
};
const formatUptimeLong = (seconds: number) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}д`);
  if (h > 0 || d > 0) parts.push(`${h}ч`);
  parts.push(`${m}м`);
  parts.push(`${s}с`);
  return parts.join(' ');
}

type HealthPayload = ExtractApiData<"getHealth">["data"]

const healthHistory = reatomMap<number, HealthPayload | null>(new Map());
const lastHistoryTimestamp = atom<number>(0);
const lastHistory = atom((ctx) => ctx.spy(healthHistory).get(ctx.get(lastHistoryTimestamp)) ?? null)

const healthFetch = reatomAsync(async (ctx) => {
  return await client<HealthPayload>("health").exec()
}, {
  onFulfill: (ctx, res) => {
    const timestamp = Date.now();

    lastHistoryTimestamp(ctx, timestamp)
    healthHistory.set(ctx, timestamp, res)

    if (ctx.get(healthHistory.sizeAtom) > 50) {
      const oldestKey = ctx.get(healthHistory).keys().next().value;
      if (oldestKey !== undefined) healthHistory.delete(ctx, oldestKey);
    }
  }
}).pipe(withDataAtom(), withRetry())

const NativeMemoryChart = ({ historyMap }: { historyMap: AtomState<typeof healthHistory> }) => {
  const points = useMemo(() => {

    return Array.from(historyMap.entries())
      .map(([timestamp, payload]) => {
        const heapUsedBytes = payload?.memory.heapUsed ?? 0;
        const heapTotalBytes = payload?.memory.heapTotal ?? 0;

        return {
          time: timestamp,
          heapUsed: heapUsedBytes / (1024 * 1024),
          heapTotal: heapTotalBytes / (1024 * 1024),
        };
      })
      .sort((a, b) => a.time - b.time);
  }, [historyMap]);

  if (points.length < 1) {
    return (
      <div className="p-6 bg-neutral-900 border border-neutral-800/60 rounded-xl text-center text-neutral-400 text-sm">
        Collecting data for chart...
      </div>
    );
  }

  const width = 500;
  const height = 150;
  const padding = 10;

  const maxValues = points.map(p => Math.max(p.heapUsed, p.heapTotal));
  const maxMemory = Math.max(...maxValues, 10);
  const minMemory = 0;
  const memoryRange = maxMemory - minMemory;

  const getSvgPoints = (dataKey: 'heapUsed' | 'heapTotal') => {
    return points
      .map((point, index) => {
        const x = padding + (index / (points.length - 1)) * (width - padding * 2);
        const y = height - padding - ((point[dataKey] - minMemory) / memoryRange) * (height - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const heapUsedPoints = getSvgPoints('heapUsed');
  const heapTotalPoints = getSvgPoints('heapTotal');
  const latest = points[points.length - 1];

  return (
    <div className="p-6 bg-neutral-900 border border-neutral-800/60 rounded-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-50">Memory</h3>
        </div>
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-500 inline-block" />
            <span className="text-neutral-400">Used:</span>
            <span className="text-neutral-50">{Math.round(latest.heapUsed)} MB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-emerald-500 inline-block" />
            <span className="text-neutral-400">Total:</span>
            <span className="text-neutral-50">{Math.round(latest.heapTotal)} MB</span>
          </div>
        </div>
      </div>
      <div className="relative w-full bg-neutral-950/40 rounded-lg p-2 border border-neutral-800/30">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
        >
          {[0, 0.5, 1].map((ratio, i) => {
            const y = padding + ratio * (height - padding * 2);
            const val = Math.round(maxMemory - ratio * memoryRange);
            return (
              <g key={i} className="opacity-20">
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#737373" strokeWidth={0.5} strokeDasharray="2 4" />
                <text x={padding} y={y - 4} fill="#737373" fontSize={6} className="font-mono">{val}MB</text>
              </g>
            );
          })}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            points={heapTotalPoints}
          />
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={heapUsedPoints}
          />
        </svg>
      </div>
    </div>
  );
};

onConnect(lastHistory, async (ctx) => {
  while (ctx.isConnected()) {
    await healthFetch.retry(ctx).catch(() => { })
    await ctx.schedule(() => sleep(10000))
  }
})

const ItemWrapper = ({ title, value }: { title: string, value: string | number }) => {
  return (
    <div className="flex flex-col gap-1 p-4 bg-neutral-900 border border-neutral-800/60 rounded-xl hover:border-neutral-700/50">
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
        {title}
      </span>
      <span className="text-2xl font-semibold tracking-tight text-neutral-50">
        {value}
      </span>
    </div>
  )
}

export const Dashboard = reatomComponent(({ ctx }) => {
  useUpdate(healthFetch, []);

  const data = ctx.spy(lastHistory);
  if (!data) return <Skeleton className='h-36 w-full' />

  return (
    <div className="">
      <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <ItemWrapper title="Аптайм" value={formatUptimeLong(data.uptime)} />
        {Object.entries(data.memory).map(([key, val]) => (
          <ItemWrapper
            key={key}
            title={key.replace(/([A-Z])/g, ' $1').trim()}
            value={formatBytesToMB(Number(val))}
          />
        ))}
      </main>
      <NativeMemoryChart historyMap={ctx.spy(healthHistory)} />
    </div>
  )
}, "Dashboard")
