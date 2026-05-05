import { reatomComponent } from "@reatom/npm-react"
import { usersControlState, usersControl, USER_ACTIONS, usersActionsChildsByGroupAtom } from "../models/users.model"
import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"
import { ContextMenuItem } from "@repo/ui/context-menu"
import { atom } from "@reatom/core"
import { DropdownMenuItem } from "@repo/ui/dropdown-menu"

const buttonIsDisabledAtom = atom((ctx) => !ctx.spy(usersControlState.eventGroup) || ctx.spy(usersControl.submit.statusesAtom).isPending)

const ApplyButton = reatomComponent<{ onClick: () => void }>(({ ctx, onClick }) => {
  const isDisabled = ctx.spy(buttonIsDisabledAtom);

  return (
    <Button background="white" className="h-8 text-sm font-semibold" disabled={isDisabled} onClick={onClick}>
      Применить
    </Button>
  )
}, "ApplyButton")

export const UserActionsWrapper = reatomComponent<
  | { type: "single", nickname: string }
  | { type: "global", nickname?: never }
>(({ ctx, type, nickname }) => {
  const eventGroup = ctx.spy(usersControlState.eventGroup);
  const eventType = ctx.spy(usersControlState.eventType);

  if (eventGroup) {
    const selected = ctx.spy(usersActionsChildsByGroupAtom)
    if (!selected) return null;

    return (
      <>
        <div className="flex flex-col gap-1 w-full">
          {selected.map((field) => (
            <div key={field.type} className="flex flex-col w-full">
              {field.label}
              {field.fields?.map((field) => (
                <Input
                  key={field.value}
                  // @ts-expect-error
                  value={ctx.spy(usersControlState.fields[field.value]) ?? ""}
                  // @ts-expect-error
                  onChange={e => usersControlState.fields[field.value](ctx, e.target.value)}
                  placeholder={field.label}
                />
              ))}
            </div>
          ))}
        </div>
        {type === 'single' && <ApplyButton onClick={() => usersControl.before(ctx, [nickname])} />}
        {type === 'global' && <ApplyButton onClick={() => usersControl.before(ctx, [])} />}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-1 w-full h-full min-w-40">
      {USER_ACTIONS.map((group) => (
        <>
          {type === 'single' && (
            <ContextMenuItem
              key={group.type}
              onClick={(e) => {
                e.preventDefault()
                usersControlState.eventGroup(ctx, group.type)
              }}
            >
              {group.label}
            </ContextMenuItem>
          )}
          {type === 'global' && (
            <DropdownMenuItem
              key={group.type}
              onClick={(e) => {
                e.preventDefault()
                usersControlState.eventGroup(ctx, group.type)
              }}
            >
              {group.label}
            </DropdownMenuItem>
          )}
        </>
      ))}
    </div>
  )
}, "UserActionsWrapper")