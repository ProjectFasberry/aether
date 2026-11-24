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
    await general.selectFrom("roles").select("is_admin").limit(1).executeTakeFirst();
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
    const row = await general
      .selectFrom("players")
      .innerJoin("roles", "roles.id", "players.role_id")
      .select("roles.is_admin")
      .where("players.nickname", "=", nickname)
      .executeTakeFirst();

    return row?.is_admin === true;
  }

  const row = await general
    .selectFrom("players")
    .select("role_id")
    .where("players.nickname", "=", nickname)
    .executeTakeFirst();

  return row?.role_id === LEGACY_ADMIN_ROLE_ID;
}

/**
 * Ban check shared by the HTTP guard and the server-to-server limbo login
 * (which has no session cookie). Admins bypass the ban, same as the guard.
 */
export async function isBannedNickname(nickname: string): Promise<boolean> {
  if (await isAdminNickname(nickname)) return false;

  const { libertybans } = await import("./libertybans-db");

  const ban = await libertybans
    .selectFrom("libertybans_victims")
    .innerJoin("libertybans_names", "libertybans_names.uuid", "libertybans_victims.uuid")
    .innerJoin("libertybans_bans", "libertybans_bans.victim", "libertybans_victims.id")
    .select("libertybans_victims.id")
    .where("libertybans_names.lower_name", "=", nickname.toLowerCase())
    .executeTakeFirst();

  return Boolean(ban?.id);
}
