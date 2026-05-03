import { client, withJsonBody, withQueryParams } from "@/shared/lib/client-wrapper"
import { logError } from "@/shared/lib/log"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async"
import { action, atom, batch, Ctx } from "@reatom/core"
import { reatomMap, reatomSet, sleep, withConcurrency, withReset } from "@reatom/framework"
import { withLocalStorage } from "@reatom/persist-web-storage"
import { toast } from "sonner"
import { notifyAboutRestrictRole } from "./actions.model"

export type PrivatedUser = {
  id: number;
  lower_case_nickname: string;
  premium_uuid: string | null;
  uuid: string;
  created_at: Date;
  avatar: string;
  nickname: string;
  role_id: number;
  role_name: string;
  status: "default" | "banned" | "muted";
};

export type PrivatedUsersPayload = {
  data: PrivatedUser[];
  meta: PaginatedMeta;
};

//#region fetch/action list
type UsersSort = "created_at" | "role" | "abc"

type Params = {
  searchQuery: string | undefined;
  asc: boolean;
  sort: UsersSort;
  startCursor: Maybe<string>;
  endCursor: Maybe<string>;
}

export const usersSearchQueryAtom = atom<Maybe<string>>(undefined, "usersSearchQuery")
export const usersAscendingAtom = atom(false, "usersAscending").pipe(withLocalStorage({ key: "privated-users-asc" }))
export const usersSortAtom = atom<UsersSort>("created_at", "usersSort").pipe(withLocalStorage({ key: "privated-users-sort" }))

const usersStartCursorAtom = atom<Maybe<string>>(undefined).pipe(withReset())
const usersEndCursorAtom = atom<Maybe<string>>(undefined).pipe(withReset())

usersSortAtom.onChange((ctx) => refetchUsersAction(ctx))
usersAscendingAtom.onChange((ctx) => refetchUsersAction(ctx))

export const updateSearchQueryAction = action(async (ctx, e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  usersSearchQueryAtom(ctx, value)

  await ctx.schedule(() => sleep(300))

  refetchUsersAction(ctx)
}, "updateSearchQueryAction").pipe(withConcurrency())

export const usersDataAtom = reatomMap<string, PrivatedUsersPayload["data"][number]>();

export const usersDataArrAtom = atom<PrivatedUsersPayload["data"]>((ctx) => Array.from(ctx.spy(usersDataAtom).values()))
export const usersMetaAtom = atom<PrivatedUsersPayload["meta"] | null>(null, "usersMeta")

async function getUsers(params: Params) {
  return client<PrivatedUsersPayload>("privated/user/list")
    .pipe(withQueryParams(params))
    .exec()
}

function getParams(ctx: Ctx) {
  return {
    searchQuery: ctx.get(usersSearchQueryAtom),
    asc: ctx.get(usersAscendingAtom),
    sort: ctx.get(usersSortAtom),
    startCursor: ctx.get(usersStartCursorAtom),
    endCursor: ctx.get(usersEndCursorAtom)
  }
}

export const usersAction = reatomAsync(async (ctx) => {
  const params = getParams(ctx)
  return await ctx.schedule(() => getUsers(params))
}, {
  name: "usersAction",
  onFulfill: (ctx, res) => {
    batch(ctx, () => {
      usersDataAtom(ctx, new Map(res.data.map((d) => [d.nickname, d])))
      usersMetaAtom(ctx, res.meta)
    })
  },
  onReject: (_, e) => {
    notifyAboutRestrictRole(e)
    logError(e)
  }
}).pipe(withStatusesAtom(), withCache({ swr: false }))
//#endregion;

//#region control events list
type ControlPayload = { ok: boolean, payload: string[] }
type UsersControlPunishType = "ban" | "mute" | "unlogin" | "kick" | "unban" | "unmute"
type UsersControlRolesType = "change_role" | "reset"
type UsersControlArgs = { reason?: string, time?: string };

const USERS_CONTROL_TYPE_WITH_ARGS: UsersControlPunishType[] = ["ban", "mute", "kick"]

export const usersControlNicknamesAtom = reatomSet<string>([], "usersControlNicknames").pipe(withReset())
export const usersControlTargetRoleIdAtom = atom<number | null>(null, "usersControlTargetRoleId").pipe(withReset())

export const usersControlReasonAtom = atom<Maybe<string>>(undefined, "usersControlReason").pipe(withReset())
export const usersControlTimeAtom = atom<Maybe<string>>(undefined, "usersControlTime").pipe(withReset())

export const userActionsRestrictDropdownMenuIsOpenAtom = atom(false, "userActionsRestrictDropdownMenuIsOpen").pipe(withReset())

userActionsRestrictDropdownMenuIsOpenAtom.onChange((ctx, state) => {
  if (!state) {
    usersControlRestrictTypeAtom.reset(ctx)
  }
})

function getArgs(ctx: Ctx) {
  const args: UsersControlArgs = {
    reason: ctx.get(usersControlReasonAtom),
    time: ctx.get(usersControlTimeAtom)
  }

  return args
}

export const usersControlRestrictAction = reatomAsync(async (ctx, type: UsersControlPunishType) => {
  const nicknames = [...ctx.get(usersControlNicknamesAtom)]

  type BodyPayload = { type: UsersControlPunishType, nicknames: string[], args?: UsersControlArgs }

  const args = getArgs(ctx)
  const body: BodyPayload = { type, nicknames, args }

  const result = await ctx.schedule(() =>
    client
      .post<ControlPayload>("privated/user/restrict/create", { timeout: 20000 })
      .pipe(withJsonBody(body))
      .exec()
  )

  return { nicknames, result }
}, {
  name: "usersControlPunishAction",
  onFulfill: (ctx, res) => {
    if (!res) return;

    const { nicknames, result } = res;

    if (!result.ok) {
      toast.error("Is not updated")
      return;
    }

    if (nicknames.length <= 2) {
      const toUpdate = [
        { key: "status", value: "banned" }
      ]

      updateUsersData(ctx, nicknames, toUpdate)
    } else {
      refetchUsersAction(ctx)
    }

    userActionsRestrictDropdownMenuIsOpenAtom.reset(ctx)
    usersControlReasonAtom.reset(ctx)
    usersControlTimeAtom.reset(ctx)
    usersControlNicknamesAtom.reset(ctx)
  },
  onReject: (ctx, e) => {
    notifyAboutRestrictRole(e)
    usersControlNicknamesAtom.reset(ctx)
    logError(e)
  }
}).pipe(withStatusesAtom())

export const usersControlRestrictTypeAtom = atom<UsersControlPunishType | null>(null, "usersControlRestrictType").pipe(withReset())

export const usersControlRestrictTypeWithArgsAtom = atom(
  (ctx) => USERS_CONTROL_TYPE_WITH_ARGS.includes(ctx.spy(usersControlRestrictTypeAtom)!) ?? false,
  "usersControlRestrictTypeWithArgs"
)

export const usersControlPunishBeforeAction = action((
  ctx,
  nicknames: string[],
) => {
  const type = ctx.get(usersControlRestrictTypeAtom)
  if (!type) throw new Error("Restrict type is not defined")

  for (const nickname of nicknames) {
    usersControlNicknamesAtom.add(ctx, nickname);
  }

  usersControlRestrictAction(ctx, type)
}, "usersControlPunishBeforeAction")

export const usersControlRolesBeforeAction = action((
  ctx,
  nicknames: string[],
  { type }: { type: UsersControlRolesType }
) => {
  for (const nickname of nicknames) {
    usersControlNicknamesAtom.add(ctx, nickname);
  }

  const targetRoleId = ctx.get(usersControlTargetRoleIdAtom)
  if (!targetRoleId) {
    throw new Error("Target role id is not defined")
  }

  usersControlRolesAction(ctx, type, targetRoleId)
}, "usersControlRolesBeforeAction")

function resetControlRoles(ctx: Ctx) {
  usersControlNicknamesAtom.reset(ctx)
  usersControlTargetRoleIdAtom.reset(ctx)
}

export const usersControlRolesAction = reatomAsync(async (
  ctx,
  type: UsersControlRolesType,
  targetRoleId: number
) => {
  const nicknames = [...ctx.get(usersControlNicknamesAtom)]

  type BodyPayload = { type: UsersControlRolesType, targetRoleId: number, nicknames: string[] }

  const body: BodyPayload = { type, nicknames, targetRoleId }

  const result = await ctx.schedule(() =>
    client.post<ControlPayload>("privated/user/roles")
      .pipe(withJsonBody(body))
      .exec()
  )

  return { nicknames, targetRoleId, result }
}, {
  name: "usersControlRolesAction",
  onFulfill: (ctx, res) => {
    if (!res) return;

    const { result, nicknames, targetRoleId } = res;

    if (!result.ok) {
      toast.error("Is not updated")
      return;
    }

    if (nicknames.length <= 2) {
      const targetRoleName = ctx.get(rolesAction.dataAtom)?.find(role => role.id === targetRoleId)?.name;
      if (!targetRoleName) throw new Error("Target role name is not defined")

      const toUpdate = [
        { key: "role_id", value: targetRoleId },
        { key: "role_name", value: targetRoleName }
      ]

      updateUsersData(ctx, nicknames, toUpdate)
    } else {
      refetchUsersAction(ctx)
    }

    resetControlRoles(ctx)
  },
  onReject: (ctx, e) => {
    notifyAboutRestrictRole(e)
    logError(e)
    resetControlRoles(ctx)
  }
}).pipe(withStatusesAtom())
//#endregion

//#region fetch roles
export type Role = {
  name: string,
  id: number
}

export const rolesAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    client<Role[]>("privated/role/list", { signal: ctx.controller.signal })
      .exec()
  )
}, {
  name: "rolesAction",
  onReject: (ctx, e) => {
    notifyAboutRestrictRole(e)
    logError(e)
  }
}).pipe(withDataAtom(), withCache({ swr: false }), withStatusesAtom())
//#endregion

//#region check/select users
export const getIsCheckedAtom = (nickname: string) => atom(
  (ctx) => ctx.spy(usersControlNicknamesAtom).has(nickname),
  "getIsChecked"
)

export const selectUserAction = action((ctx, value: boolean, nickname: string) => {
  if (value) {
    usersControlNicknamesAtom.add(ctx, nickname)
  } else {
    usersControlNicknamesAtom.delete(ctx, nickname)
  }
}, "selectUserAction")

export const usersLengthAtom = atom((ctx) => ctx.spy(usersDataArrAtom)?.length ?? 0, "usersLength")
export const usersSelectedLengthAtom = atom((ctx) => ctx.spy(usersControlNicknamesAtom).size ?? 0, "usersLength")

export const isCheckedAllAtom = atom(false, "isCheckedAll").pipe(withReset())

export const selectAllAction = action((ctx, value: boolean) => {
  if (value) {
    const users = ctx.get(usersDataArrAtom);
    if (!users) throw new Error("Users is not defined")

    const nicknames = users.map((user) => user.nickname)

    batch(ctx, () => {
      usersControlNicknamesAtom(ctx, new Set(nicknames))
      isCheckedAllAtom(ctx, true);
    })
  } else {
    batch(ctx, () => {
      usersControlNicknamesAtom.reset(ctx)
      isCheckedAllAtom.reset(ctx)
    })
  }
}, "selectAllAction")
//#endregion

//#region infinity-view (scroll)
function refetchUsersAction(ctx: Ctx) {
  function resetCursors(ctx: Ctx) {
    usersEndCursorAtom.reset(ctx)
    usersStartCursorAtom.reset(ctx)
  }

  resetCursors(ctx)
  usersAction.cacheAtom.reset(ctx)
  usersAction(ctx);
}

function updateUsersData(
  ctx: Ctx,
  nicknames: string[],
  updates: { key: string, value: string | number | boolean }[]
) {
  usersAction.cacheAtom.reset(ctx);

  const results = updates.reduce<Record<string, string | number | boolean>>(
    (acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {}
  );

  usersDataAtom(ctx, (state) => {
    const updated: typeof state = new Map();

    for (const [key, value] of state) {
      const targets = nicknames.includes(value.nickname);
      updated.set(key, targets ? { ...value, ...results } : value);
    }

    return updated
  })
}
//#endregion

//#region views
export const usersIsViewAtom = atom(false, "usersIsView")

export const updateAction = reatomAsync(async (ctx) => {
  const params = getParams(ctx);
  return await ctx.schedule(() => getUsers(params))
}, {
  name: "updateAction",
  onFulfill: (ctx, res) => {
    batch(ctx, () => {
      usersDataAtom(ctx, (state) => new Map([
        ...state,
        ...res.data.map(d => [d.nickname, d] as const)
      ]))

      usersMetaAtom(ctx, res.meta)
    })
  },
  onReject: (_, e) => {
    notifyAboutRestrictRole(e)
    logError(e)
  }
}).pipe(withStatusesAtom())

usersIsViewAtom.onChange((ctx, state) => {
  if (!state) return;

  const meta = ctx.get(usersMetaAtom)
  const endCursor = meta?.endCursor
  const hasNextPage = meta?.hasNextPage

  if (hasNextPage) {
    usersEndCursorAtom(ctx, endCursor)
    updateAction(ctx)
  }
})
//#endregion

//#region select
export const usersSelectedOverAtom = atom(
  (ctx) => ctx.spy(usersSelectedLengthAtom) >= 2,
  "usersSelectedOver"
)

export const userActionsChangeRoleDropdownMenuIsOpenAtom = atom(false, "userActionsChangeRoleDropdownMenuIsOpen")

usersControlRolesAction.onFulfill.onCall((ctx, res) => {
  userActionsChangeRoleDropdownMenuIsOpenAtom(ctx, false)
})

userActionsChangeRoleDropdownMenuIsOpenAtom.onChange((ctx, state) => {
  if (!state) {
    usersControlTargetRoleIdAtom.reset(ctx)
  }
})
//#endregion