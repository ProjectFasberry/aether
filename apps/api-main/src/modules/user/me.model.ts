import { general } from "#/shared/database/general-db";
import { sql } from "kysely";

export async function getPermissions(
  nickname: string, role_id: number
): Promise<string[]> {
  const effectivePermissions = await general
    .selectFrom('permissions as p')
    .select(['p.name'])
    .where('p.id', 'in',
      general.selectFrom('role_permissions as rp')
        .where('rp.role_id', '=', role_id)
        .select('rp.permission_id')
    )
    .union(
      general.selectFrom('permissions as p')
        .innerJoin('players_permissions as pp', 'pp.permission_id', 'p.id')
        .where('pp.nickname', '=', nickname)
        .select(['p.name'])
    )
    .execute();

  const perms = effectivePermissions.map((p) => p.name)

  return perms
}

export async function getMe(nickname: string) {
  return general
    .selectFrom("players")
    .leftJoin(
      "activity_users", (join) => join
        .on("activity_users.nickname", "=", "players.nickname")
        .on("activity_users.type", "=", sql`'join'`)
    )
    .innerJoin("roles", "roles.id", "players.role_id")
    .select([
      "players.nickname",
      "players.uuid",
      "players.role_id",
      "players.created_at as reg_date",
      "activity_users.event as login_date",
      "roles.id as role_id",
      "roles.name as role_name"
    ])
    .where("players.nickname", "=", nickname)
    .executeTakeFirst()
}