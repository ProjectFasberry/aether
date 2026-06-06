import { luckperms } from "#/shared/database/luckperms-db";
import { general } from "#/shared/database/general-db";
import type { Donate } from "@repo/shared/types/entities/donate";
import type { Player } from "@repo/shared/types/entities/user";
import dayjs from "dayjs";
import { sql } from "kysely";

export async function getDonate(
  { recipient }: { recipient: string }
): Promise<Donate> {
  const query = await luckperms
    .selectFrom("luckperms_user_permissions")
    .innerJoin("luckperms_players", "luckperms_players.uuid", "luckperms_user_permissions.uuid")
    .select([
      "luckperms_user_permissions.permission as group"
    ])
    .where("luckperms_user_permissions.permission", "like", `%group%`)
    .where("luckperms_players.username", "=", recipient)
    .executeTakeFirst()

  if (!query) return "default" as Donate

  return query.group.slice(6) as Donate
}

type PlayerRatePayload = {
  count: number;
  isRated: boolean
}

export async function getRate(
  { initiator, recipient }: { initiator: string | null, recipient: string }
): Promise<PlayerRatePayload> {
  const base = general
    .selectFrom("likes")
    .select(eb => [
      eb.fn.countAll().as("count"),
      initiator
        ? eb.fn.count("initiator").filterWhere("initiator", "=", initiator).as("isRatedByInitiator")
        : eb.val(0).as("isRatedByInitiator"),
    ])
    .where("recipient", "=", recipient)

  const result = await base.executeTakeFirst();

  return {
    count: Number(result?.count ?? 0),
    isRated: !!Number(result?.isRatedByInitiator)
  };
}

export async function getMain(
  { recipient }: { recipient: string }
): Promise<Omit<Player, "rate" | "avatar" | "group"> | null> {
  const query = await general
    .selectFrom("players")
    .leftJoin(
      "activity_users", (join) => join
        .on("activity_users.nickname", "=", "players.nickname")
        .on("activity_users.type", "=", sql`'quit'`)
    )
    .select([
      "players.nickname",
      "players.created_at as reg_date",
      "activity_users.event as login_date",
      "players.uuid",
      "players.lower_case_nickname",
    ])
    .where("players.nickname", "=", recipient)
    .executeTakeFirst()

  if (!query) return null;

  const { reg_date, login_date, ...base } = query;

  const regDate = dayjs(Number(query.reg_date)).toDate();
  const loginDate = dayjs(Number(query.login_date)).toDate()

  return {
    ...base,
    meta: {
      reg_date: regDate,
      login_date: loginDate
    }
  }
}