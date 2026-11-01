import Elysia, { t } from "elysia";
import { timingSafeEqual } from "node:crypto";
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import { wrapError } from "@repo/shared/lib/helpers";
import { auth } from "#/modules/auth/auth.model";
import { defineRequiredClientUser } from "#/lib/define";
import { ipPlugin } from "#/lib/plugins";
import { getEnv } from "#/shared/env";
import { redisService } from "#/shared/redis/client";
import { buildRouteSummary } from "#/utils";
import { withData, withError } from "#/shared/schemas";
import { DateTime } from "#/helpers/typebox";

/**
 * Join gate: the launcher asks for a one-shot ticket right before the game
 * starts, the proxy plugin consumes it during login. The ticket rides in the
 * hostname the client connects to (`<server>.<ticket>.play.fasberry.fun`), so
 * no handshake parsing or client mod is needed.
 */
const TICKET_TTL_S = 180;
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

/** GET + DEL in one round trip so a ticket cannot be used twice. */
const CONSUME_SCRIPT = `
local value = redis.call("GET", KEYS[1])
if value then redis.call("DEL", KEYS[1]) end
return value`;

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

      const server = body.server?.trim().toLowerCase() || null;

      if (server && !SERVER_ID_PATTERN.test(server)) {
        return status(400, wrapError("SERVER_ID_INVALID"));
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

export const joinGate = new Elysia().use(ticketRoute).use(verifyRoute);
