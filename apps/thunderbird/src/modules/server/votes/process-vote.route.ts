import Elysia from "elysia";
import { sql } from "kysely";
import { bisquite } from "#/shared/database/bisquite-db";
import { publishVoteNotify } from "#/lib/publishers/pub-vote-notify";
import { general } from "#/shared/database/general-db";
import { buildRouteSummary } from "#/utils";

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

    const expSign = new Bun.CryptoHasher("sha1")
      .update(nick + time + Bun.env.VOTIFIEF_SECRET_KEY)
      .digest('hex');

    if (sign !== expSign) {
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
