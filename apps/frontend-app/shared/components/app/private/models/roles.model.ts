import { client, withJsonBody } from "@/shared/lib/client-wrapper"
import { reatomAsync, withCache, withDataAtom, withErrorAtom, withStatusesAtom } from "@reatom/framework"
import { notifyAboutRestrictRole } from "./actions.model"
import { toast } from "sonner"
import { action, atom } from "@reatom/framework"
import { withAssign, withReset } from "@reatom/framework"

export type RolePayload = {
  id: number;
  name: string;
}

export type RolePermission = {
  id: number;
  name: string;
}

export type RolesRolePermissionListPayload = {
  role_id: number;
  permissions: RolePermission[];
}

export const rolesListAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() => client<RolePayload[]>("privated/role/list").exec())
}, {
  name: "rolesListAction",
  onReject: (_, e) => notifyAboutRestrictRole(e)
}).pipe(
  withDataAtom(),
  withCache({ swr: false }),
  withStatusesAtom()
)

export const permissionsAllListAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    client<RolePayload[]>(`privated/permissions/list/all`).exec()
  )
}, {
  name: "permissionsAllListAction",
  onReject: (_, e) => notifyAboutRestrictRole(e)
}).pipe(
  withDataAtom(),
  withCache({ swr: false }),
  withStatusesAtom()
)

export const permissionsByRoleListAction = reatomAsync(async (ctx, roleId: number) => {
  return await ctx.schedule(() =>
    client<RolesRolePermissionListPayload>(`privated/role/${roleId}/permission/list`).exec()
  )
}, {
  name: "permissionsByRoleListAction",
  onReject: (_, e) => notifyAboutRestrictRole(e)
}).pipe(
  withDataAtom(),
  withCache({ swr: false }),
  withStatusesAtom()
)

export const addPermissionForRoleAction = reatomAsync(async (ctx, roleId: number) => {
  const perms = ctx.get(roleNewPermsAtom).map((t) => t.id);

  const body = {
    permissions: perms
  }

  const result = await client
    .post<number>(`privated/role/${roleId}/permission/add`)
    .pipe(withJsonBody(body))
    .exec()

  return { roleId, result }
}, {
  name: "addPermissionForRoleAction",
  onFulfill: (ctx, { result, roleId }) => {
    const role = ctx.get(rolesListAction.dataAtom)?.find((role) => role.id === roleId);

    toast.success(`Добавлено ${result} ролей для роли ${role?.name}`);

    roleNewPermsAtom.reset(ctx)

    permissionsByRoleListAction.cacheAtom.reset(ctx)
    permissionsByRoleListAction(ctx, roleId)
  },
  onReject: (_, e) => notifyAboutRestrictRole(e)
}).pipe(
  withDataAtom(),
  withCache({ swr: false }),
  withStatusesAtom()
)

export const deletePermissionForRoleAction = reatomAsync(async (ctx, roleId: number) => {
  const perms = ctx.get(roleDeletedPermsAtom).map((t) => t.id);

  const body = {
    permissions: perms
  }

  const result = await client
    .delete<number>(`privated/role/${roleId}/permission/remove`)
    .pipe(withJsonBody(body))
    .exec()

  return { roleId, result }
}, {
  name: "deletePermissionForRoleAction",
  onFulfill: (ctx, { result, roleId }) => {
    const role = ctx.get(rolesListAction.dataAtom)?.find((role) => role.id === roleId);

    toast.success(`Удалено ${result} разрешений для роли ${role?.name}`);

    roleDeletedPermsAtom.reset(ctx)

    permissionsByRoleListAction.cacheAtom.reset(ctx)
    permissionsByRoleListAction(ctx, roleId)
  },
  onReject: (_, e) => notifyAboutRestrictRole(e)
}).pipe(
  withDataAtom(),
  withCache({ swr: false }),
  withStatusesAtom()
)

export const roleEditableAtom = atom<RolePayload | null>(null, "roleEditable").pipe(withReset())
export const rolesIsEditableAtom = atom((ctx) => !!ctx.spy(roleEditableAtom), "rolesIsEditable")

roleEditableAtom.onChange((ctx, state) => {
  if (!state) return;
  permissionsAllListAction(ctx)
})

export const roleNewPermsAtom = atom<RolePayload[]>([], "roleNewPerms").pipe(withReset())
export const roleDeletedPermsAtom = atom<RolePayload[]>([], "roleDeletedPerms").pipe(withReset())

export const getPermIsSelectedAtom = (id: number) => atom((ctx) => ctx.spy(roleNewPermsAtom).some(t => t.id === id))
export const getDeletedPermIsSelectedAtom = (id: number) => atom((ctx) => ctx.spy(roleDeletedPermsAtom).some(p => p.id === id))

export const permission = atom(null, "permission").pipe(
  withAssign((ctx, name) => ({
    addNewPermAction: action((ctx, payload: RolePayload) => {
      roleNewPermsAtom(ctx, (state) => state.some((item) => item.id === payload.id) ? state : [...state, payload])
    }, `${name}.addNewPermAction`),
    deleteNewPermAction: action((ctx, id: number) => {
      roleNewPermsAtom(ctx, (state) => state.filter(item => item.id !== id))
    }, `${name}.deletePermAction`),
    addDeletedPermAction: action((ctx, payload: RolePayload) => {
      roleDeletedPermsAtom(ctx, (state) => state.some((item) => item.id === payload.id) ? state : [...state, payload])
    }, `${name}.addDeletedPermAction`),
    addDeletedPermRoleAction: action((ctx, id: number) => {
      roleDeletedPermsAtom(ctx, (state) => state.filter(item => item.id !== id))
    }, `${name}.addDeletedPermRoleAction`),
    availablePerms: atom<RolePayload[]>((ctx) => {
      const all = ctx.spy(permissionsAllListAction.dataAtom);
      if (!all) return [];

      const rolePerms = ctx.spy(permissionsByRoleListAction.dataAtom)?.permissions;
      if (!rolePerms) return [];

      const roleIds = new Set(rolePerms.map(p => p.id));
      const resultPerms = all.filter(p => !roleIds.has(p.id));

      return resultPerms;
    }, "roleAvailablePerms")
  }))
)

export const saveChangesIsValidAtom = atom((ctx) => {
  const toAdd = ctx.spy(roleNewPermsAtom).length >= 1;
  const toDelete = ctx.spy(roleDeletedPermsAtom).length >= 1;
  return toAdd || toDelete
}, "saveChangesIsValid")

export const saveChangesAction = reatomAsync(async (ctx) => {
  const newPerms = ctx.get(roleNewPermsAtom)
  const removedPerms = ctx.get(roleDeletedPermsAtom)

  const events: typeof deletePermissionForRoleAction[] = [];

  if (newPerms.length >= 1) {
    events.push(addPermissionForRoleAction)
  }

  if (removedPerms.length >= 1) {
    events.push(deletePermissionForRoleAction)
  }

  if (events.length === 0) throw new Error("Events is empty")

  const roleId = ctx.get(roleEditableAtom)?.id;

  if (!roleId) throw new Error("Role id is not defined")

  const eventsToExec = events.map((event) => event(ctx, roleId))

  return await ctx.schedule(() => Promise.all(eventsToExec))
}, {
  name: "saveChangesAction",
  onFulfill: (ctx, res) => {
    toast.success("Изменения применены")
  },
  onReject: (_, e) => notifyAboutRestrictRole(e)
}).pipe(
  withStatusesAtom(),
  withErrorAtom()
)

export const getRoleIsSelectedRoleAtom = (id: number) => atom((ctx) => ctx.spy(roleEditableAtom)?.id === id)

export const toggleRoleEditAction = action((ctx, roleToEdit: RolePayload) => {
  roleEditableAtom(ctx, (state) =>
    state && state.id === roleToEdit.id ? null : roleToEdit
  )
}, "toggleEditAction")
