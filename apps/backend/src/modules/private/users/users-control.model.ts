import { general } from "#/shared/database/general-db"
import * as z from "zod/v4"
import { rcon } from "#/shared/rcon/client";
import { invariant } from "#/helpers/invariant";

type ControlPayload = {
  ok: boolean,
  type: UsersControlSchema["type"] | UsersControlRestrictSchema["type"] | UsersControlRolesSchema["type"] | UsersControlPermissionsSchema["type"],
  payload: string[]
}

const usersControlTargetsSchema = z.array(z.string())

export const usersControlRestrictSchema = z.object({
  type: z.enum(["ban", "unban", "unmute", "mute", "kick", "unregister"]),
  nicknames: usersControlTargetsSchema
})

export const usersControlSchema = z.object({
  type: z.enum(["unlogin"]),
  nicknames: usersControlTargetsSchema
})

export const usersControlRolesSchema = z.object({
  type: z.enum(["change_role", "reset"]),
  nicknames: usersControlTargetsSchema,
  targetRoleId: z.coerce.number()
})

export const playersControlPermissionsSchema = z.object({
  type: z.enum(["add", "remove"]),
  target: z.coerce.number(),
  nicknames: z.array(z.string())
})

type UsersControlSchema = z.infer<typeof usersControlSchema>
type UsersControlRolesSchema = z.infer<typeof usersControlRolesSchema>
type UsersControlRestrictSchema = z.infer<typeof usersControlRestrictSchema>
type UsersControlPermissionsSchema = z.infer<typeof playersControlPermissionsSchema>

type BaseCmd = { nickname: string }

type BanCmdArgs = | {
  type: "ban",
  time?: string,
  reason?: string
} | {
  type: "unban",
  time: never,
  reason: never
}

type MuteCmdArgs = | {
  type: "mute",
  time: string,
  reason?: string
} | {
  type: "unmute",
  time: never,
  reason: never
}

type KickCmdArgs = { reason?: string }

const getBanCmd = ({ type, nickname, reason, time }: BaseCmd & BanCmdArgs) => `${type} ${nickname} ${time} ${reason}`
const getKickCmd = ({ nickname, reason }: BaseCmd & KickCmdArgs) => `kick ${nickname} ${reason}`
const getMuteCmd = ({ type, nickname, time, reason }: BaseCmd & MuteCmdArgs) => `${type} ${nickname} ${time} ${reason}`

type ExecCmdFnReturn = string
type ExecCmdFn = (payload: any) => ExecCmdFnReturn;

const EXEC_CMDS: Partial<Record<UsersControlRestrictSchema["type"], ExecCmdFn>> = {
  ban: getBanCmd,
  unban: getBanCmd,
  mute: getMuteCmd,
  unmute: getMuteCmd,
  kick: getKickCmd,
}

type ExecCmdArgs = | {
  type: "ban",
  args: BanCmdArgs
} | {
  type: "mute",
  args: MuteCmdArgs
} | {
  type: "kick",
  args: KickCmdArgs
} | {
  type: "unban",
  args?: never
} | {
  type: "unmute",
  args?: never
} | {
  type: "unregister",
  args: KickCmdArgs
}

type ExecCmd = ExecCmdArgs & { nicknames: UsersControlSchema["nicknames"] }

async function execCmd({
  type, nicknames, args: rawArgs
}: ExecCmd) {
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
    const toExec = exec?.(payload);

    if (toExec) {
      const cmd = await client.send(toExec);
      return stripMinecraftColors(cmd.toString());
    }
  });
  
  let result: string[];

  try {
    result = await Promise.all(tasks);
  } catch (e) {
    console.error(e);
    throw e;
  }

  invariant(nicknames.length === result.length, "Not updated")

  return result
}

type Nicknames = UsersControlSchema["nicknames"]

async function alert(msg: string) {
  const client = rcon.get()
  await client.send(`alert ${msg}`)
}

async function banUsers(nicknames: Nicknames, args: Omit<BanCmdArgs, "type">): Promise<ControlPayload> {
  const type = "ban"
  await execCmd({ type, nicknames, args: { ...args, type } })
  return { ok: true, type, payload: nicknames }
}

async function unbanUsers(nicknames: Nicknames): Promise<ControlPayload> {
  const type = "unban"
  await execCmd({ type, nicknames })
  return { ok: true, type, payload: nicknames }
}

async function muteUsers(nicknames: Nicknames, args: Omit<MuteCmdArgs, "type">): Promise<ControlPayload> {
  const type = "mute"
  await execCmd({ type, nicknames, args: { ...args, type } })
  return { ok: true, type, payload: nicknames }
}

async function unmuteUsers(nicknames: Nicknames): Promise<ControlPayload> {
  const type = "unmute"
  await execCmd({ type, nicknames })
  return { ok: true, type, payload: nicknames }
}

async function kickUsers(nicknames: Nicknames, args: KickCmdArgs): Promise<ControlPayload> {
  const type = "kick"
  await execCmd({ type, nicknames, args });
  return { ok: true, type, payload: nicknames }
}

async function unregisterUsers(nicknames: Nicknames, args: KickCmdArgs): Promise<ControlPayload> {
  console.log(nicknames, args);

  return { ok: true, type: "unregister", payload: nicknames }
}

// 
export async function changeRoleUsers(
  nicknames: UsersControlSchema["nicknames"],
  { type, targetRoleId }: Omit<UsersControlRolesSchema, "nicknames">
): Promise<ControlPayload> {
  if (type === 'change_role') {
    const query = await general
      .updateTable("players")
      .set({ role_id: targetRoleId })
      .where("nickname", "in", nicknames)
      .returning("nickname")
      .execute()

    console.log(query);

    return { ok: true, type, payload: nicknames }
  }

  if (type === 'reset') {
    return { ok: true, type, payload: nicknames }
  }

  throw new Error(`Change role type is not defined "${type}"`)
}

async function unloginUsers(nicknames: Nicknames): Promise<ControlPayload> {
  return { ok: true, type: "unlogin", payload: nicknames }
}

const TARGETS_EVENTS: Record<UsersControlRestrictSchema["type"], (t: Nicknames, a: unknown) => Promise<ControlPayload>> = {
  ban: (t, args) => banUsers(t, args as BanCmdArgs),
  unban: (t) => unbanUsers(t),
  mute: (t, args) => muteUsers(t, args as MuteCmdArgs),
  unmute: (t) => unmuteUsers(t),
  kick: (t, args) => kickUsers(t, args as KickCmdArgs),
  unregister: (t, args) => unregisterUsers(t, args as KickCmdArgs)
}

export async function controlRestrictUsers({ nicknames, args, type }: UsersControlRestrictSchema & { args: unknown }) {
  const event = TARGETS_EVENTS[type];
  const result = await event(nicknames, args)
  alert(`${JSON.stringify(result)}`)
  return result
}

export async function controlUsers({ nicknames, type }: UsersControlSchema) {
  const TARGETS_EVENTS: Record<UsersControlSchema["type"], (t: UsersControlSchema["nicknames"]) => Promise<ControlPayload>> = {
    unlogin: (targets) => unloginUsers(targets),
  }

  const event = TARGETS_EVENTS[type];
  return event(nicknames)
}

export async function editPlayerRole(
  nicknames: string[],
  { target, type }: Omit<UsersControlPermissionsSchema, "nicknames">
) {
  return {}
}