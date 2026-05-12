import { reatomComponent } from "@reatom/npm-react"
import { usersControlState, usersControl, USER_ACTIONS, usersActionsChildsByGroupAtom } from "../models/users.model"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { atom } from "@reatom/framework"
import { Fragment } from "react/jsx-runtime"

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
        <Fragment key={group.type}>
          {type === 'single' && (
            <div
              onClick={(e) => {
                e.preventDefault()
                usersControlState.eventGroup(ctx, group.type)
              }}
            >
              {group.label}
            </div>
          )}
          {type === 'global' && (
            <div
              onClick={(e) => {
                e.preventDefault()
                usersControlState.eventGroup(ctx, group.type)
              }}
            >
              {group.label}
            </div>
          )}
        </Fragment>
      ))}
    </div>
  )
}, "UserActionsWrapper")