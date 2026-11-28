import { describe, expect, it } from "bun:test";
import { collectSessions, MAX_OPEN_SESSION_MS, sumSessionMs, type ActivityRow } from "./activity-sessions";

const at = (iso: string): Date => new Date(iso);

const row = (event: string, type: "join" | "quit", session: string | null = null): ActivityRow => ({
  event,
  type,
  session,
});

describe("collectSessions", () => {
  it("pairs a join and a quit", () => {
    const sessions = collectSessions([
      row("2026-11-14T10:00:00Z", "join"),
      row("2026-11-14T10:30:00Z", "quit"),
    ], at("2026-11-14T12:00:00Z"));

    expect(sessions).toHaveLength(1);
    expect(sessions[0].start.toISOString()).toBe("2026-11-14T10:00:00.000Z");
    expect(sessions[0].end.toISOString()).toBe("2026-11-14T10:30:00.000Z");
  });

  it("uses the session id when several joins are pending", () => {
    const sessions = collectSessions([
      row("2026-11-14T10:00:00Z", "join", "a"),
      row("2026-11-14T10:10:00Z", "join", "b"),
      row("2026-11-14T10:20:00Z", "quit", "b"),
      row("2026-11-14T10:40:00Z", "quit", "a"),
    ], at("2026-11-14T12:00:00Z"));

    expect(sessions.map((session) => session.end.toISOString())).toEqual([
      "2026-11-14T10:20:00.000Z",
      "2026-11-14T10:40:00.000Z",
    ]);
  });

  it("ignores a quit without a join", () => {
    const sessions = collectSessions([
      row("2026-11-14T10:00:00Z", "quit"),
      row("2026-11-14T10:10:00Z", "join"),
      row("2026-11-14T10:20:00Z", "quit"),
    ], at("2026-11-14T12:00:00Z"));

    expect(sessions).toHaveLength(1);
    expect(sessions[0].start.toISOString()).toBe("2026-11-14T10:10:00.000Z");
  });

  it("caps a session without a quit at 24 hours", () => {
    const sessions = collectSessions([
      row("2026-11-10T10:00:00Z", "join"),
    ], at("2026-11-14T12:00:00Z"));

    expect(sessions).toHaveLength(1);
    expect(sessions[0].end.getTime() - sessions[0].start.getTime()).toBe(MAX_OPEN_SESSION_MS);
  });
});

describe("sumSessionMs", () => {
  it("sums every paired session", () => {
    const total = sumSessionMs([
      row("2026-11-14T10:00:00Z", "join", "a"),
      row("2026-11-14T12:00:00Z", "quit", "a"),
      row("2026-11-14T13:00:00Z", "join", "b"),
      row("2026-11-14T14:00:00Z", "quit", "b"),
    ], at("2026-11-14T15:00:00Z"));

    expect(total).toBe(3 * 60 * 60 * 1000);
  });

  it("counts an open session up to now, not beyond 24 hours", () => {
    const recent = sumSessionMs([
      row("2026-11-14T10:00:00Z", "join"),
    ], at("2026-11-14T11:30:00Z"));
    const stale = sumSessionMs([
      row("2026-11-10T10:00:00Z", "join"),
    ], at("2026-11-14T12:00:00Z"));

    expect(recent).toBe(90 * 60 * 1000);
    expect(stale).toBe(MAX_OPEN_SESSION_MS);
  });

  it("ignores quits without a join", () => {
    expect(sumSessionMs([
      row("2026-11-14T10:00:00Z", "quit"),
    ], at("2026-11-14T11:00:00Z"))).toBe(0);
  });
});
