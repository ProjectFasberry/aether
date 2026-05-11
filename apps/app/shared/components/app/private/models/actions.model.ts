import { action, atom, type AtomState } from "@reatom/framework"
import { isDeepEqual, reatomRecord, withReset } from "@reatom/framework"
import { toast } from "sonner";

const PARENTS = ["news", "banner", "event", "dictionaries"] as const
const TYPES = ["create", "edit", "view"] as const;

export type ActionParent = typeof PARENTS[number]
export type ActionType = typeof TYPES[number]

export const actionsSearchParamsAtom = reatomRecord<Record<string, string>>({}, "actionsSearchParams").pipe(withReset())
export const actionsParentAtom = atom<ActionParent | null>(null, "actionsParent").pipe(withReset())
export const actionsTypeAtom = atom<ActionType>("view", "actionsType").pipe(withReset())
export const actionsTargetAtom = atom<Nullable<string>>(null, "actionsTarget").pipe(withReset())

export const getIsSelectedActionAtom = (targetParent: ActionParent, targetType: ActionType) => atom(
  (ctx) => {
    const parent = ctx.spy(actionsParentAtom) === targetParent;
    const type = ctx.spy(actionsTypeAtom) === targetType
    return parent && type
  },
  "getIsSelectedAction"
)

actionsSearchParamsAtom.onChange((ctx, state) => {
  const { parent, type, target } = state

  if (!PARENTS.includes(parent as ActionParent) || !TYPES.includes(type as ActionType)) return;

  actionsParentAtom(ctx, parent as ActionParent)
  actionsTypeAtom(ctx, type as ActionType)

  if (type !== 'create') {
    if (typeof target === 'string' && target.trim()) {
      actionsTargetAtom(ctx, target)
    }
  } else {
    actionsTargetAtom(ctx, null)
  }
})

type CreateLinkParams = {
  parent?: AtomState<typeof actionsParentAtom>,
  type?: AtomState<typeof actionsTypeAtom>,
  target?: string,
}

export const createActionsLinkValueAction = action((ctx, params: CreateLinkParams) => {
  const url = new URL(window.location.href);
  const next = { ...ctx.get(actionsSearchParamsAtom) }

  const parent = params.parent;
  const type = params.type;

  if (!parent || !type) throw new Error("Parent or type is not defined")
  if (!PARENTS.includes(parent)) throw new Error("Parent is not defined")
  if (!TYPES.includes(type)) throw new Error("Type is not defined")

  next.parent = parent
  url.searchParams.set('parent', parent)

  next.type = type
  url.searchParams.set('type', type)

  if (params.type === 'create') {
    delete next.target
    url.searchParams.delete('target')
  }

  if (params.type !== 'create' && params.target?.trim()) {
    next.target = params.target
    url.searchParams.set('target', params.target)
  }

  return { next, url }
}, "createActionsLinkValueAction")

export const createActionsLinkAction = action((ctx, params: CreateLinkParams) => {
  const { next, url } = createActionsLinkValueAction(ctx, params)

  actionsSearchParamsAtom(ctx, next)
  window.history.pushState({}, '', url)
}, "createActionsLinkAction")

export const actionsCanGoBackAtom = (inputParent: AtomState<typeof actionsParentAtom>) => atom((ctx) => {
  const state = ctx.spy(actionsSearchParamsAtom);
  const { parent: currentParent, type, target } = state;

  const isThisParent = currentParent === inputParent
  if (!isThisParent) return false;

  const validParent = PARENTS.includes(currentParent)
  const validType = type === 'create' || type === 'edit' || type === 'view'
  const validTarget = type !== 'create' ? typeof target === 'string' && target.trim() !== '' : true

  const result = validParent && validType && validTarget
  return result
}, 'actionsCanGoBack')

export const actionsGoBackAction = action((ctx) => {
  const url = new URL(window.location.href)

  url.searchParams.delete('parent')
  url.searchParams.delete('type')
  url.searchParams.delete('target')

  window.history.pushState({}, '', url)

  actionsSearchParamsAtom.reset(ctx)
  actionsParentAtom.reset(ctx)
  actionsTypeAtom.reset(ctx)
  actionsTargetAtom.reset(ctx)
}, "actionsGoBackAction")

export function notifyAboutRestrictRole(e: Error | unknown) {
  if (e instanceof Error) {
    if (e.message === 'restricted_by_role') {
      toast.error("Действие недоступно из-за политики ролей")
    }
  }
}

export const getSelectedParentAtom = (parent: ActionParent) => atom((ctx) => ctx.spy(actionsParentAtom) === parent)

export const compareChanges = (actual: Record<string, string | null>, old: Record<string, string | null>) => {
  return Object.keys(actual).some((key) => {
    const value = actual[key]
    let oldValue = old[key]

    const hasInput =
      value === null || value === undefined
        ? false
        : typeof value === 'string'
          ? value.trim().length > 0
          : Boolean(value)

    let unchanged = false

    if (typeof value === 'string' && typeof oldValue === 'string') {
      unchanged = value === oldValue
    } else if (value && oldValue) {
      unchanged = isDeepEqual(value, oldValue)
    } else {
      unchanged = value === oldValue
    }

    return hasInput && !unchanged
  })
}

export const collectChanges = (
  actual: Record<string, any>,
  old: Record<string, any>
) => {
  const changes: Record<string, any> = {}

  for (const key of Object.keys(actual)) {
    const value = actual[key]
    const oldValue = old[key]

    const isDifferent =
      typeof value === 'object' && value !== null && oldValue !== null
        ? !isDeepEqual(value, oldValue)
        : value !== oldValue

    const hasInput =
      value !== null && value !== undefined &&
      (typeof value !== 'string' || value.trim().length > 0)

    if (hasInput && isDifferent) changes[key] = value
  }

  return changes
}