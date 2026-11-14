export type ActivityRow = {
  event: Date | string;
  type: 'join' | 'quit';
  session: string | null;
};

export type ActivitySession = {
  start: Date;
  end: Date;
};

/** A missed quit must not turn into days of "playtime". */
export const MAX_OPEN_SESSION_MS = 24 * 60 * 60 * 1000;

/**
 * Pairs joins and quits into sessions. The proxy publishes one join/quit pair
 * per connection, and `session` is used when both sides carry it. Without a
 * session id, the oldest pending join wins.
 */
export function collectSessions(rows: ActivityRow[], now: Date): ActivitySession[] {
  const pending: Array<{ start: Date; session: string | null }> = [];
  const sessions: ActivitySession[] = [];

  for (const row of rows) {
    const eventTime = new Date(row.event);

    if (row.type === 'join') {
      pending.push({ start: eventTime, session: row.session });
      continue;
    }

    if (pending.length === 0) continue;

    let index = -1;

    if (row.session) {
      index = pending.findIndex((entry) => entry.session === row.session);
    }

    if (index === -1) index = 0;

    const [join] = pending.splice(index, 1);

    sessions.push({
      start: join.start,
      end: eventTime > join.start ? eventTime : join.start,
    });
  }

  for (const join of pending) {
    const cappedEnd = new Date(join.start.getTime() + MAX_OPEN_SESSION_MS);
    const end = cappedEnd < now ? cappedEnd : now;

    sessions.push({
      start: join.start,
      end: end > join.start ? end : join.start,
    });
  }

  return sessions;
}
