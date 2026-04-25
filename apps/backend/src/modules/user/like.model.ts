import { general } from "#/shared/database/general-db";
import { getPlayerAvatar } from "../server/skin/skin.model";

export async function ratePlayer({ recipient, initiator }: { initiator: string, recipient: string }) {
  const query = await general.transaction().execute(async (trx) => {
    const del = await trx
      .deleteFrom("likes")
      .where("initiator", "=", initiator)
      .where("recipient", "=", recipient)
      .executeTakeFirst();

    if (del.numDeletedRows) {
      return "unrated";
    }

    const upd = await trx
      .insertInto("likes")
      .values({ initiator, recipient })
      .executeTakeFirst();

    if (upd.numInsertedOrUpdatedRows) {
      return "rated"
    }

    throw new Error("Rating is not updated")
  });

  return query
}

export async function getPlayerLikes(nickname: string) {
  const query = await general
    .selectFrom("likes")
    .select(eb => [
      "initiator",
      "created_at",
      eb.fn.countAll().over().as('total_count')
    ])
    .where("recipient", "=", nickname)
    .limit(8)
    .orderBy("created_at", "desc")
    .execute()

  const data = await Promise.all(
    query.map(async (row) => ({
      initiator: row.initiator, 
      created_at: row.created_at,
      avatar: await getPlayerAvatar(row.initiator)
    }))
  )

  const count: number = Number(query[0]?.total_count ?? 0)

  return {
    data,
    meta: {
      count
    }
  }
}