import { luckperms } from "#/shared/database/luckperms-db";
import { general } from "#/shared/database/general-db";
import type { Donate } from "@repo/shared/types/entities/donate";
import type { Player } from "@repo/shared/types/entities/user";
import dayjs from "dayjs";
import { sql } from "kysely";
import { resolveDonateGroup } from "./player-donate";

/**
 * The primary LuckPerms group is authoritative: a player can inherit or keep
 * stale `group.*` permissions from several groups at once, and picking the
 * first permission row used to return a random one.
 */
export function getDonateQuery(db: typeof luckperms, recipient: string) {
  return db
    .selectFrom("luckperms_players")
    .select(["primary_group"])
    .where("username", "=", recipient)
}

export async function getDonate(
  { recipient }: { recipient: string }
): Promise<Donate> {
  const query = await getDonateQuery(luckperms, recipient).executeTakeFirst()

  return resolveDonateGroup(query?.primary_group)
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