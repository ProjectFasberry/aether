import Elysia from "elysia";
import { sql } from "kysely";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { bisquite } from "#/shared/database/bisquite-db";
import { publishVoteNotify } from "#/events/publishers/pub-vote-notify";
import { general } from "#/shared/database/general-db";
import { appLogger } from "#/shared/constants/logger";
import { buildRouteSummary } from "#/lib/routes";
import { voteSites } from "./vote-sites.model";

/** A callback older or newer than this is rejected as a replay. */
const TIME_WINDOW_MS = 10 * 60 * 1000;

type Payload = { nick: string, time: string, sign: string };

function equalHex(received: string, expected: string): boolean {
  const left = Buffer.from(received, "utf8");
  const right = Buffer.from(expected, "utf8");

  return left.length === right.length && timingSafeEqual(left, right);
}

/** Unix seconds or milliseconds, rejected when outside the callback window. */
function voteTimestamp(value: string): { ms: number, period: string } | null {
  const numeric = Number(value);
  const parsed = Number.isFinite(numeric)
    ? (numeric > 1e12 ? numeric : numeric * 1000)
    : Date.parse(value);

  if (!Number.isFinite(parsed)) return null;

  const ms = parsed;
  if (Math.abs(Date.now() - ms) > TIME_WINDOW_MS) return null;

  return { ms, period: new Date(ms).toISOString().slice(0, 10) };
}

/**
 * Stores the vote first and only then credits the balance: a failed credit
 * removes the row again, so the site can retry instead of losing the reward.
 */
async function postVoted(nickname: string, period: string): Promise<void> {
  const inserted = await sql<{ id: number }>`
    insert into voted_users (nickname, period)
    values (${nickname}, ${period})
    on conflict (lower(nickname), period) do nothing
    returning id
  `.execute(general);

  const id = inserted.rows[0]?.id;
  if (!id) return;

  try {
    const event = await general
      .selectFrom("events")
      .select("reward")
      .where("origin", "=", "vote-for-server")
      .executeTakeFirst();

    if (!event || !event.reward) throw new Error("VOTE_REWARD_NOT_CONFIGURED");

    const updated = await bisquite
      .updateTable("cmi_users")
      .set({ Balance: sql`Balance + ${Number(event.reward)}` })
      .where("username", "=", nickname)
      .executeTakeFirst();

    if (Number(updated.numUpdatedRows) === 0) throw new Error("VOTE_PLAYER_NOT_FOUND");
  } catch (error) {
    // The row is the idempotency key: drop it so a retry can credit.
    await sql`delete from voted_users where id = ${id}`.execute(general).catch(() => undefined);
    throw error;
  }

  publishVoteNotify(nickname);
}

export const processPlayerVote = new Elysia()
  .post("/vote", async ({ body, status }) => {
    const parsedBody = await body as Payload;

    const nick = parsedBody.nick?.trim();
    const time = parsedBody.time;
    const sign = parsedBody.sign;

    if (!nick || !time || !sign) {
      throw status(400, "INVALID_PAYLOAD");
    }

    if (nick.length > 16) {
      throw status(400, "NICKNAME_ERROR");
    }

    const timestamp = voteTimestamp(time);
    if (!timestamp) {
      appLogger.warn({ message: "Vote callback rejected: timestamp outside the window", nickname: nick });
      throw status(400, "INVALID_PAYLOAD");
    }

    const site = await voteSites.getDefault();
    if (!site) {
      throw status(503, "VOTE_SITE_NOT_CONFIGURED");
    }

    const hmac = createHmac("sha256", site.secret)
      .update(`${nick}${time}`)
      .digest("hex");

    // The old callback sends sha1(nick + time + secret); keep it one release
    // with the same time window so a site still on the old format can migrate.
    const legacy = createHash("sha1")
      .update(`${nick}${time}${site.secret}`)
      .digest("hex");

    if (!equalHex(sign, hmac)) {
      if (!equalHex(sign, legacy)) {
        appLogger.warn({ message: "Vote callback rejected: bad signature", nickname: nick });
        throw status(400, "INVALID_PAYLOAD");
      }

      appLogger.warn({ message: "Vote callback used the legacy SHA1 signature", nickname: nick });
    }

    try {
      await postVoted(nick, timestamp.period);
    } catch (error) {
      appLogger.warn({
        message: "Vote reward failed",
        nickname: nick,
        error: error instanceof Error ? error.message : String(error),
      });
      throw status(500, "VOTE_REWARD_FAILED");
    }

    return "OK";
  }, {
    parse: "multipart/form-data",
    detail: {
      summary: buildRouteSummary("Process player vote"),
    },
  });
