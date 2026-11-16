import { general } from "#/shared/database/general-db"
import { revokeGameSession } from "#/shared/services/game-session"
import { createError, withShared } from "#/helpers/error"
import { callServerCommand } from "#/shared/nats/command"
import { clearPermissionCache } from "#/shared/services/permission-cache";
import { invariant } from "#/utils";
import { type Static, t } from "elysia";

const USER_CONTROL_ERRORS = {
  ROLE_NOT_FOUND: { msg: "Role not found", code: 400 },
} as const

/** Shared registry for user-control failures; routes read it with `reader`. */
export const userControlError = createError(withShared(USER_CONTROL_ERRORS), "INTERNAL_UNKNOWN")

const userControlTypeSchemaT = t.UnionEnum(["unlogin"])
const userRestrictTypeSchemaT = t.UnionEnum(["ban", "unban", "unmute", "mute", "kick"])
const userPermissionTypeSchema = t.UnionEnum(["change_role", "reset"]);

const nicknamesSchema = t.Array(t.String())

export const controlPayloadSchema = t.Object({
  ok: t.Boolean(),
  type: t.Union([
    userControlTypeSchemaT,
    userRestrictTypeSchemaT,
    userPermissionTypeSchema,
  ]),
  payload: nicknamesSchema
})

export const userRestrictSchema = t.Object({
  type: userRestrictTypeSchemaT,
  nicknames: nicknamesSchema
})
export const userControlSchemaT = t.Object({
  type: userControlTypeSchemaT,
  nicknames: nicknamesSchema
})
export const userRolesSchema = t.Object({
  type: userPermissionTypeSchema,
  nicknames: nicknamesSchema,
  targetRoleId: t.Number()
})

type Payload = Static<typeof controlPayloadSchema>

type UserControlSchema = Static<typeof userControlSchemaT>
type UserRolesSchema = Static<typeof userRolesSchema>
type UserRestrictSchema = Static<typeof userRestrictSchema>

type BanCmdArgs =
  | { type: "ban", time?: string, reason?: string }
  | { type: "unban", time: never, reason: never }

type MuteCmdArgs =
  | { type: "mute", time: string, reason?: string }
  | { type: "unmute", time: never, reason: never }

type KickCmdArgs = { reason?: string }

type ExecCmdArgs =
  | { type: "ban", args: BanCmdArgs }
  | { type: "mute", args: MuteCmdArgs }
  | { type: "kick", args: KickCmdArgs }
  | { type: "unban", args?: never }
  | { type: "unmute", args?: never }

type RestrictPayload = {
  type: string;
  nickname: string;
  time?: string | number;
  reason?: string;
};

/** CMI console commands; `callServerCommand` adds the `cmi` parent. */
const RESTRICT_COMMANDS: Record<UserRestrictSchema["type"], (payload: RestrictPayload) => string> = {
  ban: ({ nickname, time, reason }) => ["ban", nickname, time, reason].filter(Boolean).join(" "),
  unban: ({ nickname }) => `unban ${nickname}`,
  mute: ({ nickname, time, reason }) => ["mute", nickname, time, reason].filter(Boolean).join(" "),
  unmute: ({ nickname }) => `unmute ${nickname}`,
  kick: ({ nickname, reason }) => ["kick", nickname, reason].filter(Boolean).join(" "),
}

const RESTRICT_EVENTS: Record<UserRestrictSchema["type"], (t: Nicknames, a: unknown) => Promise<Payload>> = {
  ban: async (nicknames, args) => {
    const type = "ban"
    await execCmd({ type, nicknames, args: { ...args as Omit<BanCmdArgs, "type">, type } })
    // The 24h game session must not outlive the ban.
    await Promise.all(nicknames.map((nickname) => revokeGameSession(nickname).catch(() => undefined)))
    return { ok: true, type, payload: nicknames }
  },
  unban: async (nicknames) => {
    const type = "unban"
    await execCmd({ type, nicknames })
    return { ok: true, type, payload: nicknames }
  },
  mute: async (nicknames, args) => {
    const type = "mute"
    await execCmd({ type, nicknames, args: { ...args as Omit<MuteCmdArgs, "type">, type } })
    return { ok: true, type, payload: nicknames }
  },
  unmute: async (nicknames) => {
    const type = "unmute"
    await execCmd({ type, nicknames })
    return { ok: true, type, payload: nicknames }
  },
  kick: async (nicknames, args) => {
    const type = "kick"
    await execCmd({ type, nicknames, args: args as KickCmdArgs });
    return { ok: true, type, payload: nicknames }
  },
}

const CONTROL_EVENTS: Record<UserControlSchema["type"], (t: Nicknames) => Promise<Payload>> = {
  unlogin: (t) => unloginUsers(t),
}

/**
 * Runs the CMI command on the backend that hosts the player (or on `bisquite`
 * for offline players) through the NATS order stream. The previous RCON
 * implementation threw "not implemented" and every restrict action was a 500.
 */
async function execCmd({
  type, nicknames, args: rawArgs
}: ExecCmdArgs & { nicknames: UserControlSchema["nicknames"] }): Promise<string[]> {
  const build = RESTRICT_COMMANDS[type]
  invariant(build, "Restrict command is not defined")

  const args = Object.fromEntries(
    Object.entries((rawArgs ?? {}) as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
  )

  await Promise.all(
    nicknames.map(async (nickname) => {
      await callServerCommand({
        parent: "cmi",
        value: build({ ...args, nickname } as RestrictPayload),
        meta: { recipient: nickname, fallbackServer: "bisquite" },
      })
    })
  )

  return nicknames
}

type Nicknames = Static<typeof nicknamesSchema>

export async function changeRoleUsers(
  nicknames: UserControlSchema["nicknames"],
  { type, targetRoleId }: Omit<UserRolesSchema, "nicknames">
) {
  if (type === 'change_role') {
    // `luckperms_group` comes from migration `0034`; the overlay keeps it typed
    // until `bun gen:types:db` runs against the migrated database.
    const role = await general
      .selectFrom("roles")
      .select(["id", "luckperms_group"])
      .where("id", "=", targetRoleId)
      .executeTakeFirst();

    if (!role) throw userControlError.raise("ROLE_NOT_FOUND");

    await general
      .updateTable("players")
      .set({ role_id: targetRoleId })
      .where("nickname", "in", nicknames)
      .execute()

    clearPermissionCache();

    // The panel role and the LuckPerms group are two sources of truth; keep the
    // game side in sync through the same command bus the store uses.
    if (role.luckperms_group) {
      await Promise.all(
        nicknames.map((nickname) =>
          callServerCommand({
            parent: "lp",
            value: `user ${nickname} parent set ${role.luckperms_group}`,
            meta: { recipient: nickname, fallbackServer: "bisquite" },
          })
        )
      )
    }

    return { ok: true, type, payload: nicknames }
  }

  if (type === 'reset') {
    return { ok: true, type, payload: nicknames }
  }

  throw new Error(`Change role type is not defined "${type}"`)
}

async function unloginUsers(nicknames: Nicknames): Promise<Payload> {
  return { ok: true, type: "unlogin", payload: nicknames }
}

export async function restrictUser({ nicknames, args, type }: UserRestrictSchema & { args: unknown }) {
  const event = RESTRICT_EVENTS[type];
  invariant(event, "Event is not defined");

  return await event(nicknames, args)
}

export async function controlUser({ nicknames, type }: UserControlSchema) {
  const event = CONTROL_EVENTS[type];
  invariant(event, "Event is not defined");

  return await event(nicknames);
}
