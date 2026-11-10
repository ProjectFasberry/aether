import { sql } from "kysely";
import { general } from "./general-db";
import { appLogger } from "#/shared/constants/logger";

/** Roles with this id were the only staff role before `roles.is_admin` existed. */
const LEGACY_ADMIN_ROLE_ID = 3;

/**
 * `roles.is_admin` arrives with migration `0026_roles_is_admin.sql`. Until it
 * is applied, the ban bypass keeps using the legacy admin role id; the probe
 * runs once on boot, so the next restart after the migration switches over.
 */
let hasAdminFlag: boolean | null = null;

export async function detectRoleAdminFlag(): Promise<void> {
  try {
    await sql`select is_admin from roles limit 1`.execute(general);
    hasAdminFlag = true;
  } catch (error) {
    hasAdminFlag = false;
    appLogger.warn({
      message: "roles.is_admin is missing; ban bypass falls back to role_id = 3",
      error,
    });
  }
}

export async function isAdminNickname(nickname: string): Promise<boolean> {
  if (hasAdminFlag === true) {
    const result = await sql<{ is_admin: boolean }>`
      select coalesce(roles.is_admin, false) as is_admin
      from players
      join roles on roles.id = players.role_id
      where players.nickname = ${nickname}
    `.execute(general);

    return result.rows[0]?.is_admin === true;
  }

  const row = await general
    .selectFrom("players")
    .select("role_id")
    .where("players.nickname", "=", nickname)
    .executeTakeFirst();

  return row?.role_id === LEGACY_ADMIN_ROLE_ID;
}
