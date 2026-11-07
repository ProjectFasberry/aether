import Elysia, { t } from "elysia";
import { timingSafeEqual } from "node:crypto";
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import { wrapError } from "@repo/shared/lib/helpers";
import { auth } from "#/modules/auth/auth.model";
import { defineRequiredClientUser } from "#/lib/define";
import { ipPlugin } from "#/lib/plugins";
import { getEnv } from "#/shared/env";
import { general } from "#/shared/database/general-db";
import { redisService } from "#/shared/redis/client";
import { buildRouteSummary } from "#/utils";
import { withData, withError } from "#/shared/schemas";
import { DateTime } from "#/helpers/typebox";
import { allowRequest } from "#/shared/services/rate-limit";

/**
 * Join gate: the launcher asks for a one-shot ticket right before the game
 * starts, the proxy plugin consumes it during login. The ticket rides in the
 * hostname the client connects to (`<server>.<ticket>.play.fasberry.fun`), so
 * no handshake parsing or client mod is needed.
 */
const TICKET_TTL_S = 180;
/** After a successful verify the nickname may reconnect without a new ticket. */
const RECONNECT_TTL_S = 1800;
/** RFC 4648 base32, lowercase, no padding: 32 random bytes -> 52 chars. */
const TICKET_PATTERN = /^[a-z2-7]{52}$/;
const SERVER_ID_PATTERN = /^[a-z0-9_-]{1,32}$/;
const GATE_HEADER = "x-fasberry-gate";

type TicketPayload = {
  nickname: string;
  server: string | null;
  ip: string;
  created_at: number;
};

const ticketKey = (ticket: string) => `join:ticket:${ticket}`;
const passKey = (nickname: string) => `join:pass:${nickname.toLowerCase()}`;

/** GET + DEL in one round trip so a ticket cannot be used twice. */
const CONSUME_SCRIPT = `
local value = redis.call("GET", KEYS[1])
if value then redis.call("DEL", KEYS[1]) end
return value`;

/**
 * The server list flag is a pre-connect block: no ticket is issued and no
 * reconnect pass is honoured while ops disabled the backend.
 */
async function serverUnavailable(server: string | null): Promise<boolean> {
  if (!server) return false;

  const row = await general
    .selectFrom("servers")
    .select(["available"])
    .where("origin", "=", server.toLowerCase())
    .executeTakeFirst();

  // Unknown ids are left to the proxy routing/forced-hosts check.
  return row ? !row.available : false;
}

function gateSecret(): string | null {
  return getEnv().GATE_SECRET ?? null;
}

function secretMatches(received: string | undefined): boolean {
  const expected = gateSecret();

  if (!expected || !received) return false;

  const a = Buffer.from(received);
  const b = Buffer.from(expected);

  return a.length === b.length && timingSafeEqual(a, b);
}

const ticketRoute = new Elysia()
  .use(ipPlugin())
  .use(defineRequiredClientUser())
  .post(
    "/launcher/session/ticket",
    async ({ session, body, ip, status }) => {
      const payload = await auth.getSessionPayload(session);

      // Only a launcher session may mint tickets: browser sessions must not.
      if (!payload || payload.client !== "launcher") {
        return status(401, wrapError("LAUNCHER_SESSION_REQUIRED"));
      }

      // A ticket is cheap but writes to Redis; keep a runaway launcher bounded.
      if (!(await allowRequest("ticket:account", payload.nickname.toLowerCase(), 20, 60))) {
        return status(429, wrapError("TOO_MANY_REQUESTS"));
      }

      const server = body.server?.trim().toLowerCase() || null;

      if (server && !SERVER_ID_PATTERN.test(server)) {
        return status(400, wrapError("SERVER_ID_INVALID"));
      }

      if (await serverUnavailable(server)) {
        return status(403, wrapError("SERVER_UNAVAILABLE"));
      }

      const ticket = encodeBase32LowerCaseNoPadding(crypto.getRandomValues(new Uint8Array(32)));
      const record: TicketPayload = {
        nickname: payload.nickname,
        server,
        ip,
        created_at: Date.now(),
      };

      await redisService
        .getInstance()
        .set(ticketKey(ticket), JSON.stringify(record), "EX", TICKET_TTL_S);

      return { data: { ticket, expires_at: new Date(record.created_at + TICKET_TTL_S * 1000) } };
    },
    {
      body: t.Object({ server: t.Optional(t.Nullable(t.String())) }),
      response: {
        200: withData(t.Object({ ticket: t.String(), expires_at: DateTime })),
        400: withError(t.String()),
        401: withError(t.String()),
        403: withError(t.String()),
        429: withError(t.UnionEnum(["TOO_MANY_REQUESTS"])),
      },
      detail: {
        summary: buildRouteSummary("Issue a join ticket for the launcher"),
      },
    },
  );

const verifyRoute = new Elysia().post(
  "/launcher/session/verify",
  async ({ body, headers, status }) => {
    // A missing secret must not turn the gate into an open door.
    if (!gateSecret()) return status(503, wrapError("GATE_DISABLED"));

    if (!secretMatches(headers[GATE_HEADER])) return status(403, wrapError("FORBIDDEN"));

    if (!TICKET_PATTERN.test(body.ticket)) return status(404, wrapError("TICKET_NOT_FOUND"));

    const raw = await redisService
      .getInstance()
      .eval(CONSUME_SCRIPT, 1, ticketKey(body.ticket));

    if (typeof raw !== "string" || !raw) return status(404, wrapError("TICKET_NOT_FOUND"));

    let record: TicketPayload | null = null;

    try {
      record = JSON.parse(raw) as TicketPayload;
    } catch {
      return status(404, wrapError("TICKET_NOT_FOUND"));
    }

    if (record.nickname.toLowerCase() !== body.nickname.toLowerCase()) {
      return status(403, wrapError("TICKET_NICKNAME_MISMATCH"));
    }

    // The ticket is bound to the backend picked in the launcher, so a ticket
    // for one server cannot be replayed against another.
    if (record.server && body.server && record.server !== body.server) {
      return status(403, wrapError("TICKET_SERVER_MISMATCH"));
    }

    // The flag can flip between issuing and consuming a ticket.
    if (await serverUnavailable(record.server)) {
      return status(403, wrapError("SERVER_UNAVAILABLE"));
    }

    // The player is in the game now. Keep a short-lived pass so that a
    // disconnect (title screen, network blip) does not need a fresh launcher
    // launch: the client reconnects with the same or the plain host.
    await redisService
      .getInstance()
      .set(passKey(record.nickname), JSON.stringify(record), "EX", RECONNECT_TTL_S);

    return { data: { nickname: record.nickname } };
  },
  {
    body: t.Object({
      ticket: t.String({ maxLength: 64 }),
      nickname: t.String({ minLength: 1, maxLength: 32 }),
      server: t.Optional(t.String({ maxLength: 32 })),
    }),
    response: {
      200: withData(t.Object({ nickname: t.String() })),
      403: withError(t.String()),
      404: withError(t.String()),
      503: withError(t.String()),
    },
    detail: {
      summary: buildRouteSummary("Verify and consume a join ticket (proxy gate)"),
    },
  },
);


/**
 * Reconnect without a fresh ticket: a player who already passed the gate keeps a
 * short-lived pass bound to the nickname (and the backend, when one was picked).
 * The client often reconnects to the plain `play.fasberry.fun` after quitting to
 * the title screen or after a network blip, and demanding a new launcher launch
 * for that is hostile.
 */
const reconnectRoute = new Elysia().post(
  "/launcher/session/reconnect",
  async ({ body, headers, status }) => {
    if (!gateSecret()) return status(503, wrapError("GATE_DISABLED"));

    if (!secretMatches(headers[GATE_HEADER])) return status(403, wrapError("FORBIDDEN"));

    const key = passKey(body.nickname);
    const raw = await redisService.getInstance().get(key);

    if (!raw) return status(404, wrapError("TICKET_NOT_FOUND"));

    let record: TicketPayload | null = null;

    try {
      record = JSON.parse(raw) as TicketPayload;
    } catch {
      return status(404, wrapError("TICKET_NOT_FOUND"));
    }

    if (record.nickname.toLowerCase() !== body.nickname.toLowerCase()) {
      return status(403, wrapError("TICKET_NICKNAME_MISMATCH"));
    }

    if (record.server && body.server && record.server !== body.server) {
      return status(403, wrapError("TICKET_SERVER_MISMATCH"));
    }

    if (await serverUnavailable(record.server)) {
      return status(403, wrapError("SERVER_UNAVAILABLE"));
    }

    // Sliding window: an active player is never kicked out by the pass expiring.
    await redisService.getInstance().expire(key, RECONNECT_TTL_S);

    return { data: { nickname: record.nickname } };
  },
  {
    body: t.Object({
      nickname: t.String({ minLength: 1, maxLength: 32 }),
      server: t.Optional(t.String({ maxLength: 32 })),
    }),
    response: {
      200: withData(t.Object({ nickname: t.String() })),
      403: withError(t.String()),
      404: withError(t.String()),
      503: withError(t.String()),
    },
    detail: {
      summary: buildRouteSummary("Verify a reconnect pass for the proxy gate"),
    },
  },
);

export const joinGate = new Elysia().use(ticketRoute).use(verifyRoute).use(reconnectRoute);
