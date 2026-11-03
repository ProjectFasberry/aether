import Elysia from "elysia";
import { sql } from "kysely";
import { timingSafeEqual } from "node:crypto";
import { bisquite } from "#/shared/database/bisquite-db";
import { publishVoteNotify } from "#/lib/publishers/pub-vote-notify";
import { general } from "#/shared/database/general-db";
import { buildRouteSummary } from "#/utils";
import { voteSites } from "./vote-sites.model";

async function postVoted(nickname: string) {
  const result = await general
    .insertInto("voted_users")
    .values({ nickname })
    .onConflict((ob) => ob.column("nickname").doNothing())
    .execute();

  if (Number(result[0].numInsertedOrUpdatedRows) === 0) {
    return
  }

  const { reward } = await general
    .selectFrom("events")
    .select("reward")
    .where("origin", "=", "vote-for-server")
    .executeTakeFirstOrThrow()

  const addCharism = await bisquite
    .updateTable("cmi_users")
    .set({
      Balance: sql`Balance + ${Number(reward)}`
    })
    .where("username", "=", nickname)
    .executeTakeFirstOrThrow()

  if (Number(addCharism.numUpdatedRows) === 0) {
    return
  }

  publishVoteNotify(nickname)

  return
}

type Payload = { nick: string, time: string, sign: string }

export const processPlayerVote = new Elysia()
  .post("/vote", async ({ body, status }) => {
    const parsedBody = await body as Payload

    const nick = parsedBody["nick"]
    const time = parsedBody["time"]
    const sign = parsedBody["sign"]

    if (!nick || !time || !sign) {
      throw status(400, "INVALID_PAYLOAD")
    }

    if (nick.length > 16) {
      throw status(400, "NICKNAME_ERROR")
    }

    const site = await voteSites.getDefault();

    if (!site) {
      throw status(503, "VOTE_SITE_NOT_CONFIGURED")
    }

    const expSign = new Bun.CryptoHasher("sha1")
      .update(nick + time + site.secret)
      .digest('hex');

    const received = Buffer.from(sign, "utf8");
    const expected = Buffer.from(expSign, "utf8");

    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw status(400, "INVALID_PAYLOAD")
    }

    await postVoted(nick);

    return "OK"
  }, {
    parse: "multipart/form-data",
    detail: {
      summary: buildRouteSummary("Process player vote")
    }
  })
