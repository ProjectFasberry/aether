import { client, withJsonBody, withQueryParams } from "@/shared/lib/client-wrapper"
import { logError } from "@/shared/lib/log"
import {
  reatomAsync, withAbort, withCache, withDataAtom, withErrorAtom, withStatusesAtom,
  type Action, type AtomMut, type SetAtom
} from "@reatom/framework"
import { action, atom, batch } from "@reatom/framework"
import { reatomMap, reatomSet, sleep, withAssign, withConcurrency, withReset } from "@reatom/framework"
import { withLocalStorage } from "@reatom/persist-web-storage"
import { toast } from "sonner"
import { notifyAboutRestrictRole } from "./actions.model"
import { DEFAULT_SOFT_DELAY } from "@/shared/consts"
import { invariant } from "@/shared/lib/invariant"
import { alertDialog } from "@/shared/components/config/alert-dialog/alert-dialog.model"
import { createViewerModel } from "@/shared/models/shared.model"

export type PrivatedUser = PrivatedUsersPayload["data"][number]
export type PrivatedUsersPayload = ExtractApiData<"getPrivatedUserList">["data"]

type UsersSort = "created_at" | "role" | "abc"

type Params = {
  searchQuery: Nullable<string>;
  asc: boolean;
  sort: UsersSort;
  startCursor: Nullable<string>;
  endCursor: Nullable<string>;
}

export const { Component: UsersViewer, inViewAtom: usersListInView } = createViewerModel({
  name: "users-list",
})

export const usersState = atom(null, "usersState").pipe(
  withAssign((_, name) => ({
    filters: atom(null, `${name}.filters`).pipe(
      withAssign(() => ({
        searchQuery: atom<Nullable<string>>(null),
        asc: atom(false).pipe(withLocalStorage({ key: "privated-users-asc" })),
        sortBy: atom<UsersSort>("created_at").pipe(withLocalStorage({ key: "privated-users-sort" })),
        startCursor: atom<Nullable<string>>(null).pipe(withReset()),
        endCursor: atom<Nullable<string>>(null).pipe(withReset())
      }))
    ),
    data: reatomMap<string, PrivatedUsersPayload["data"][number]>(),
    meta: atom<PrivatedUsersPayload["meta"] | null>(null)
  }))
)

usersState.filters.sortBy.onChange((ctx) => users.refetchAll(ctx))
usersState.filters.asc.onChange((ctx) => users.refetchAll(ctx))

export const usersDataArrAtom = atom<PrivatedUsersPayload["data"]>((ctx) => Array.from(ctx.spy(usersState.data).values()))

async function getUsers(params: Params) {
  return client<PrivatedUsersPayload>("privated/user/list").pipe(withQueryParams(params)).exec()
}

const getParams = action((ctx) => ({
  searchQuery: ctx.get(usersState.filters.searchQuery),
  asc: ctx.get(usersState.filters.asc),
  sort: ctx.get(usersState.filters.sortBy),
  startCursor: ctx.get(usersState.filters.startCursor),
  endCursor: ctx.get(usersState.filters.endCursor)
}))

export const users = atom(null, "users").pipe(
  withAssign((_, name) => ({
    searchQueryChangeEvent: action(async (ctx, e: React.ChangeEvent<HTMLInputElement>) => {
      usersState.filters.searchQuery(ctx, e.target.value)
      await ctx.schedule(() => sleep(DEFAULT_SOFT_DELAY))
      users.refetchAll(ctx)
    }).pipe(
      withConcurrency()
    ),
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() => getUsers(getParams(ctx)))
    }, {
      name: `${name}.fetch`,
      onFulfill: (ctx, res) => {
        usersState.data(ctx, new Map(res.data.map((d) => [d.nickname, d])))
        usersState.meta(ctx, res.meta)
      },
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(
      withStatusesAtom(),
      withCache({ swr: false }),
      withAbort()
    ),
    refetchAll: action((ctx) => {
      usersState.filters.endCursor.reset(ctx)
      usersState.filters.startCursor.reset(ctx)
      users.fetch.cacheAtom.reset(ctx)
      users.fetch(ctx);
    }),
    update: reatomAsync(async (ctx) => {
      return await ctx.schedule(() => getUsers(getParams(ctx)))
    }, {
      name: `${name}.update`,
      onFulfill: (ctx, res) => {
        usersState.data(ctx, (state) => new Map([...state, ...res.data.map(d => [d.nickname, d] as const)]))
        usersState.meta(ctx, res.meta)
      },
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(
      withStatusesAtom()
    ),
    fetchSingle: reatomAsync(async (ctx, nickname: string) => {
      if (nickname.trim().length === 0) return;

      return await ctx.schedule(() => client<PrivatedUser>(`privated/user/${nickname}`).exec())
    }, {
      name: `${name}.fetchSingle`,
      onReject: (_, e) => logError(e, { type: "combined" })
    }).pipe(
      withDataAtom(),
      withCache({ swr: false }),
      withStatusesAtom(),
      withAbort()
    )
  }))
)

type ControlPayload = ExtractApiData<"postPrivatedUserRestrictCreate">["data"]
type UsersControlRolesType = "change_role" | "reset"
type UsersControlArgs = { reason: Nullable<string>, time: Nullable<string> };

type UserAction = {
  type: string,
  label: string,
  permission?: string,
  fields?: Array<{
    label: string,
    value: string
  }>,
  childs?: Array<UserAction>
}

export const USER_ACTIONS: UserAction[] = [
  {
    type: "restricts",
    label: "Рестрикты",
    childs: [
      {
        label: "Бан",
        type: "ban",
        fields: [
          { label: "Срок", value: "duration" },
          { label: "Причина", value: "reason" }
        ]
      },
      {
        label: "Разбан", type: "unban",
      },
      {
        label: "Мут",
        type: "mute",
        fields: [
          { label: "Срок", value: "duration" },
          { label: "Причина", value: "reason" }
        ]
      },
      {
        label: "Размут", type: "unmute"
      },
      {
        label: "Кик",
        type: "kick",
        fields: [
          { label: "Причина", value: "reason" }
        ]
      },
      {
        label: "Выйти из сессии", type: "unlogin",
      },
    ]
  },
  {
    type: "unregister",
    label: "Удалить",
    permission: "delete-account",
    fields: [
      { label: "Причина", value: "reason" }
    ]
  }
]

export const usersControlState = atom(null, "_usersControlState").pipe(
  withAssign((_, name) => ({
    nicknames: reatomSet<string>([], `${name}.nicknames`).pipe(withReset()),
    targetRoleId: atom<Nullable<number>>(null, `${name}.targetRoleId`).pipe(withReset()),
    fields: atom(null, `${name}.fields`).pipe(
      withAssign((_, name) => ({
        reason: atom<Nullable<string>>(null, `${name}.reason`).pipe(withReset()),
        duration: atom<Nullable<string>>(null, `${name}.duration`).pipe(withReset()),
      }))
    ),
    isOpen: atom(false, `${name}.isOpen`),
    selectedId: atom<Nullable<string>>(null, `${name}.selectedId`).pipe(withReset()),
    isCheckedAll: atom(false, `${name}.isCheckedAll`).pipe(withReset()),
    selectedUser: atom<Nullable<string>>(null, `${name}.selectedUser`).pipe(withReset())
  }))
)
export const usersControl = atom(null, "_usersControl").pipe(
  withAssign((_, name) => ({
    submit: reatomAsync(async (ctx, type: string) => {
      const nicknames = [...ctx.get(usersControlState.nicknames)]

      type BodyPayload = { type: string, nicknames: string[], args?: UsersControlArgs }

      const args: UsersControlArgs = {
        reason: ctx.get(usersControlState.fields.reason),
        time: ctx.get(usersControlState.fields.duration)
      }

      const body: BodyPayload = { type, nicknames, args }

      const result = await client
        .post<ControlPayload>("privated/user/restrict/create", { timeout: 20000 })
        .pipe(withJsonBody(body))
        .exec()

      return { nicknames, result }
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx, res) => {
        if (!res) return;

        const { nicknames, result } = res;

        if (!result.ok) {
          toast.error("Is not updated")
          return;
        }

        if (nicknames.length <= 2) {
          const toUpdate = [
            { k: "status", v: "banned" }
          ]

          updateUsersData(ctx, nicknames, toUpdate)
        } else {
          users.refetchAll(ctx)
        }

        usersControlState.isOpen(ctx, false)
        usersControlState.fields.reason.reset(ctx)
        usersControlState.fields.duration.reset(ctx)
        usersControlState.nicknames.reset(ctx)
      },
      onReject: (ctx, e) => {
        usersControlState.nicknames.reset(ctx)
        notifyAboutRestrictRole(e)
        logError(e, { type: "combined" })
      }
    }).pipe(
      withStatusesAtom()
    ),
    before: action((ctx, nicknames: string[], eventGroup: string) => {
      for (const nickname of nicknames) {
        usersControlState.nicknames.add(ctx, nickname);
      }

      usersControl.submit(ctx, eventGroup)
    }),
    resetAll: action((ctx) => {
      usersControlState.nicknames.reset(ctx)
      usersControlState.targetRoleId.reset(ctx)
    }),
    select: {
      single: action((ctx, value: boolean | string, nickname: string) => {
        if (typeof value !== 'boolean') return;

        if (value) {
          usersControlState.nicknames.add(ctx, nickname)
        } else {
          usersControlState.nicknames.delete(ctx, nickname)
        }
      }),
      all: action((ctx, value: boolean) => {
        if (value) {
          const users = ctx.get(usersDataArrAtom);
          if (!users || users.length === 0) throw new Error("Users is not defined")

          const nicknames = users.map((user) => user.nickname)

          batch(ctx, () => {
            usersControlState.nicknames(ctx, new Set(nicknames))
            usersControlState.isCheckedAll(ctx, true);
          })
        } else {
          batch(ctx, () => {
            usersControlState.nicknames.reset(ctx)
            usersControlState.isCheckedAll.reset(ctx)
          })
        }
      })
    }
  }))
)
export const usersRoles = atom(null, "_usersRoles").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() => client<Role[]>("privated/role/list", { signal: ctx.controller.signal }).exec())
    }, {
      name: `${name}.fetch`,
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(
      withDataAtom(),
      withCache({ swr: false }),
      withStatusesAtom(),
      withAbort()
    ),
    submit: reatomAsync(async (ctx, type: UsersControlRolesType, targetRoleId: number) => {
      const nicknames = [...ctx.get(usersControlState.nicknames)]

      type BodyPayload = { type: UsersControlRolesType, targetRoleId: number, nicknames: string[] }

      const body: BodyPayload = { type, nicknames, targetRoleId }

      const result = await client
        .post<ControlPayload>("privated/user/roles")
        .pipe(withJsonBody(body))
        .exec()

      return { nicknames, targetRoleId, result }
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx, res) => {
        if (!res) return;

        const { result, nicknames, targetRoleId } = res;

        if (!result.ok) {
          toast.error("Is not updated")
          return;
        }

        if (nicknames.length <= 2) {
          const targetRoleName = ctx.get(usersRoles.fetch.dataAtom)?.find(role => role.id === targetRoleId)?.name;
          invariant(targetRoleName, "Target role name is not defined")

          const toUpdate = [
            { k: "role_id", v: targetRoleId },
            { k: "role_name", v: targetRoleName }
          ]

          updateUsersData(ctx, nicknames, toUpdate)
        } else {
          users.refetchAll(ctx)
        }

        usersControl.resetAll(ctx)
        usersControlState.selectedId.reset(ctx)
      },
      onReject: (ctx, e) => {
        notifyAboutRestrictRole(e)
        usersControl.resetAll(ctx)
        logError(e, { type: "combined" })
      }
    }).pipe(
      withStatusesAtom()
    ),
    before: action((ctx, nicknames: string[], { type }: { type: UsersControlRolesType }) => {
      for (const nickname of nicknames) {
        usersControlState.nicknames.add(ctx, nickname);
      }

      const targetRoleId = ctx.get(usersControlState.targetRoleId)
      invariant(targetRoleId, "Target role id is not defined")

      usersRoles.submit(ctx, type, targetRoleId)
    }, `${name}.before`)
  }))
)

export type Role = { name: string, id: number }

export const usersLengthAtom = atom((ctx) => ctx.spy(usersDataArrAtom)?.length ?? 0)
export const usersSelectedLengthAtom = atom((ctx) => ctx.spy(usersControlState.nicknames).size ?? 0)

const updateUsersData = action((
  ctx,
  nicknames: string[],
  updates: { k: string, v: string | number | boolean }[]
) => {
  users.fetch.cacheAtom.reset(ctx);

  const results = updates.reduce<Record<string, string | number | boolean>>(
    (acc, { k, v }) => {
      acc[k] = v;
      return acc;
    }, {}
  );

  usersState.data(ctx, (state) => {
    const updated: typeof state = new Map();

    for (const [key, value] of state) {
      const targets = nicknames.includes(value.nickname);
      updated.set(key, targets ? { ...value, ...results } : value);
    }

    return updated
  })
})

export const usersSelectedOverAtom = atom((ctx) => ctx.spy(usersSelectedLengthAtom) >= 2)

usersControlState.selectedId.onChange((ctx, state) => !state && usersControlState.targetRoleId.reset(ctx))

usersState.meta.onChange((ctx, state) => {
  if (!state) return;

  usersState.filters.endCursor(ctx, (prev) => state.endCursor ? state.endCursor : prev)
})

usersListInView.onChange((ctx, state) => {
  if (!state) return;

  const meta = ctx.get(usersState.meta)

  const hasNextPage = meta?.hasNextPage
  if (!hasNextPage) return;

  users.update(ctx)
})

export const userIsSelectedAtom = (nickname: string) => atom((ctx) => ctx.spy(usersControlState.selectedUser) === nickname)
export const isCheckedAtom = (nickname: string) => atom((ctx) => ctx.spy(usersControlState.nicknames).has(nickname))

//#region users management
export type CreateUserVariant = "game" | "profile";

const CREATE_USER_OPTIONS: { label: string, value: CreateUserVariant }[] = [
  { label: "Игра", value: "game" }, { label: "Профиль", value: "profile" }
]

// TODO: replace to the roles fetched data
const CREATE_USER_ROLE_OPTIONS: { label: string, value: number }[] = [
  { label: "Игрок", value: 0 }, { label: "Модератор", value: 1 }
]

const createUserState = atom(null, "createUserState").pipe(
  withAssign((_, name) => ({
    isOpen: atom(false, `${name}.isOpen`),
    nickname: atom("", `${name}.nickname`).pipe(withReset()),
    password: atom("", `${name}.password`).pipe(withReset()),
    // only 0 or 1
    role: reatomSet<number>(new Set([0]), `${name}.role`).pipe(withReset()),
    options: reatomSet<CreateUserVariant>(new Set(["profile", "game"] as const), `${name}.options`).pipe(withReset())
  }))
)
const createUser = atom(null, 'createUser').pipe(
  withAssign((_, name) => ({
    handle: action((ctx, e: React.FormEvent) => {
      e.preventDefault()

      const json = {
        nickname: ctx.get(createUserState.nickname),
        password: ctx.get(createUserState.password),
        options: Array.from(ctx.get(createUserState.options)),
        role: Array.from(ctx.get(createUserState.role))[0]
      }

      createUser.submit(ctx, json);
    }),
    submit: reatomAsync(async (ctx, json: { nickname: string, password: string, options: string[], role: number }) => {
      createUser.submit.errorAtom.reset(ctx);
      const result = await client.post("privated/users/register", { json }).exec();
      return result
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx, res) => {
        createUserState.isOpen(ctx, false)
      }
    }).pipe(
      withStatusesAtom(),
      withErrorAtom()
    )
  }))
)
createUserState.isOpen.onChange((ctx, state) => {
  if (!state) {
    createUserState.nickname.reset(ctx)
    createUserState.password.reset(ctx);
    createUserState.role.reset(ctx);
    createUserState.options.reset(ctx);
    createUser.submit.errorAtom.reset(ctx);
  }
})

type CreateUserField =
  | { type: "input", placeholder: string, value: AtomMut<string> }
  | {
    type: "select",
    placeholder: string,
    value: (SetAtom<CreateUserVariant> | SetAtom<number>) & { reset: Action<[], Set<any>> },
    maxValues: number,
    options: Array<{ label: string, value: string | number }>,
    multiple: boolean
  }

const CREATE_USER_FIELDS: CreateUserField[] = [
  {
    placeholder: "Никнейм", type: "input", value: createUserState.nickname
  },
  {
    placeholder: "Пароль", type: "input", value: createUserState.password
  },
  {
    placeholder: "Роль",
    type: "select",
    value: createUserState.role,
    options: CREATE_USER_ROLE_OPTIONS,
    maxValues: 1,
    multiple: false
  },
  {
    placeholder: "Вариант",
    type: "select",
    value: createUserState.options,
    options: CREATE_USER_OPTIONS,
    maxValues: 2,
    multiple: true
  }
]

const onValueChange = action((ctx, value: string[], field: Extract<typeof CREATE_USER_FIELDS[number], { type: "select" }>) => {
  if (value.length === 0) {
    field.value.reset(ctx);
    return;
  }

  const first = String(value[0]).trim()
  const isNotANumber = first === "" || Number.isNaN(Number(first));

  if (isNotANumber) {
    const state = field.value as typeof createUserState.options
    state(ctx, new Set(value as CreateUserVariant[]));
  } else {
    const state = field.value as typeof createUserState.role
    state(ctx, new Set(value.map(d => Number(d))));
  }
})

const deleteUserState = atom(null, "deleteUserState").pipe(
  withAssign((_, name) => ({
    isOpen: atom(false, `${name}.isOpen`),
    nickname: atom("", `${name}.nickname`).pipe(withReset()),
    reason: atom("", `${name}.reason`).pipe(withReset())
  }))
)
const deleteUser = atom(null, "deleteUser").pipe(
  withAssign((_, name) => ({
    handle: action((ctx, e: React.FormEvent) => {
      e.preventDefault();

      alertDialog.open(ctx, {
        title: "Вы точно хотите удалить этого игрока?",
        confirmAction: deleteUser.submit,
        confirmLabel: "Подтвердить",
        autoClose: true
      })
    }, `${name}.handle`),
    submit: reatomAsync(async (ctx) => {
      deleteUser.submit.errorAtom.reset(ctx);

      const nickname = ctx.get(deleteUserState.nickname);

      const json = {
        nickname,
        reason: ctx.get(deleteUserState.reason)
      }

      const result = await client
        .post("privated/users/unregister", { json })
        .exec();

      return { result, nickname }
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx, { nickname }) => {
        toast.success(`Игрок ${nickname} удален`);
        deleteUserState.isOpen(ctx, false)
      }
    }).pipe(
      withStatusesAtom(),
      withErrorAtom()
    )
  }))
)
deleteUserState.isOpen.onChange((ctx, state) => {
  if (!state) {
    deleteUserState.nickname.reset(ctx)
    deleteUserState.reason.reset(ctx)
    deleteUser.submit.errorAtom.reset(ctx)
  }
})

const DELETE_USER_FIELDS = [
  { placeholder: "Никнейм", value: deleteUserState.nickname, required: true },
  { placeholder: "Причина", value: deleteUserState.reason }
]

export const usersManagementModel = () => {
  return {
    createUser,
    createUserState,
    deleteUser,
    deleteUserState,
    onValueChange,
    DELETE_USER_FIELDS,
    CREATE_USER_FIELDS,
    CREATE_USER_OPTIONS,
    CREATE_USER_ROLE_OPTIONS
  }
}
//#endregion
