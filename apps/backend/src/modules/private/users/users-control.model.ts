import { general } from "#/shared/database/general-db"
import { rcon } from "#/shared/rcon/client";
import { invariant } from "#/helpers/invariant";
import { type Static, t } from "elysia";

const userControlTypeSchemaT = t.UnionEnum(["unlogin"])
const userRestrictTypeSchemaT = t.UnionEnum(["ban", "unban", "unmute", "mute", "kick"])
const userPermissionTypeSchema = t.UnionEnum(["change_role", "reset"]);
const userPermissionsTypeSchema = t.UnionEnum(["add", "remove"]);

const nicknamesSchema = t.Array(t.String())

export const controlPayloadSchema = t.Object({
  ok: t.Boolean(),
  type: t.Union([
    userControlTypeSchemaT,
    userRestrictTypeSchemaT,
    userPermissionTypeSchema,
    userPermissionsTypeSchema
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
export const playersPermissionsSchema = t.Object({
  type: userPermissionsTypeSchema,
  target: t.Number(),
  nicknames: nicknamesSchema
})

type Payload = Static<typeof controlPayloadSchema>

type UserControlSchema = Static<typeof userControlSchemaT>
type UserRolesSchema = Static<typeof userRolesSchema>
type UserRestrictSchema = Static<typeof userRestrictSchema>
type UserPermissionsSchema = Static<typeof playersPermissionsSchema>

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

const EXEC_CMDS: Record<UserRestrictSchema["type"], (payload: any) => string> = {
  ban: ({ type, nickname, time, reason }) => `${type} ${nickname} ${time} ${reason}`,
  unban: ({ type, nickname, time, reason }) => `${type} ${nickname} ${time} ${reason}`,
  mute: ({ type, nickname, reason, time }) => `${type} ${nickname} ${time} ${reason}`,
  unmute: ({ type, nickname, reason, time }) => `${type} ${nickname} ${time} ${reason}`,
  kick: ({ nickname, reason }) => `kick ${nickname} ${reason}`,
}

const RESTRICT_EVENTS: Record<UserRestrictSchema["type"], (t: Nicknames, a: unknown) => Promise<Payload>> = {
  ban: async (nicknames, args) => {
    const type = "ban"
    await execCmd({ type, nicknames, args: { ...args as Omit<BanCmdArgs, "type">, type } })
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

async function execCmd({
  type, nicknames, args: rawArgs
}: ExecCmdArgs & { nicknames: UserControlSchema["nicknames"] }): Promise<string[]> {
  const client = rcon.get()

  function stripMinecraftColors(text: string): string {
    return text.replace(/§./g, '');
  }

  const obj = rawArgs ?? {};
  const args = Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );

  const exec = EXEC_CMDS[type]

  const tasks = nicknames.map(async nickname => {
    const payload = { ...args, nickname };
    const toExec = exec(payload);
    const cmd = await client.send(toExec);
    return stripMinecraftColors(cmd.toString());
  });

  const result: string[] = await Promise.all(tasks)
  invariant(nicknames.length === result.length, "Not updated")
  return result
}

type Nicknames = Static<typeof nicknamesSchema>

async function alert(msg: string) {
  await rcon.get().send(`alert ${msg}`)
}

export async function changeRoleUsers(
  nicknames: UserControlSchema["nicknames"],
  { type, targetRoleId }: Omit<UserRolesSchema, "nicknames">
) {
  if (type === 'change_role') {
    const query = await general
      .updateTable("players")
      .set({ role_id: targetRoleId })
      .where("nickname", "in", nicknames)
      .returning("nickname")
      .execute()

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

  const result = await event(nicknames, args)
  alert(`${JSON.stringify(result)}`)

  return result
}

export async function controlUser({ nicknames, type }: UserControlSchema) {
  const event = CONTROL_EVENTS[type];
  invariant(event, "Event is not defined");

  const result = await event(nicknames);
  alert(`${JSON.stringify(result)}`)

  return result
}

export async function editPlayerRole(
  { nicknames, target, type }: Omit<UserPermissionsSchema, "nicknames"> & { nicknames: string[] }
) {
  return {}
}