import { reatomComponent } from "@reatom/npm-react"
import { usersControlState, usersControl, USER_ACTIONS } from "../models/users.model"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import type { AtomMut } from "@reatom/framework"
import { Menu } from "@ark-ui/react/menu"
import { dropdownMenuItemVariants, menuContentVariant } from "@/shared/ui/menu"
import { Portal } from "@ark-ui/react/portal"

type UserActionsWrapperProps =
  | { type: "single", nickname: string }
  | { type: "global", nickname?: never }

const ActionInput = reatomComponent<{ atom: AtomMut<string | null>, label: string }>(({ ctx, atom, label }) => (
  <Input
    value={ctx.spy(atom) ?? ""}
    onChange={e => atom(ctx, e.target.value)}
    placeholder={label}
  />
), "ActionInput")

const ActionButton = reatomComponent<UserActionsWrapperProps & {
  eventGroup: string, label?: string, isMenuItem?: boolean
}>(({ ctx, type, label, eventGroup, nickname, isMenuItem }) => {
  const isPending = ctx.spy(usersControl.submit.statusesAtom).isPending

  const handleClick = () => {
    usersControl.before(ctx, type === 'single' ? [nickname] : [], eventGroup)
  }

  if (isMenuItem) {
    return (
      <Menu.Item value={eventGroup} className={dropdownMenuItemVariants()} onClick={handleClick} disabled={isPending}>
        {label ?? "Применить"}
      </Menu.Item>
    )
  }

  return (
    <Button
      background="white"
      className="h-8 text-sm font-semibold"
      disabled={isPending}
      withSpinner
      isLoading={isPending}
      onClick={handleClick}
    >
      {label ?? "Применить"}
    </Button>
  )
}, "ActionButton")

const ActionMenuNode = reatomComponent<UserActionsWrapperProps & {
  item: NonNullable<typeof USER_ACTIONS[number]["childs"]>[number]
}>(({ item, ...props }) => {
  if (item.childs) {
    return (
      <Menu.Root key={item.type}>
        <Menu.TriggerItem className={dropdownMenuItemVariants()}>
          {item.label}
        </Menu.TriggerItem>
        <Portal>
          <Menu.Positioner>
            <Menu.Content className={menuContentVariant()}>
              {item.childs.map((child) => <ActionMenuNode key={child.type} item={child} {...props} />)}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    )
  }

  if (item.fields) {
    return (
      <Menu.Root key={item.type}>
        <Menu.TriggerItem className={dropdownMenuItemVariants()}>
          {item.label}
        </Menu.TriggerItem>
        <Portal>
          <Menu.Positioner>
            <Menu.Content className={menuContentVariant()}>
              <div className="flex flex-col gap-1 w-full">
                {item.fields.map(({ value, label }: any) => (
                  // @ts-expect-error
                  <ActionInput key={value} atom={usersControlState.fields[value]} label={label} />
                ))}
                <ActionButton eventGroup={item.type} {...props} />
              </div>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    )
  }

  return (
    <ActionButton key={item.type} isMenuItem eventGroup={item.type} label={item.label} {...props} />
  )
}, "ActionMenuNode")

export const UserActionsWrapper = (props: UserActionsWrapperProps) => (
  USER_ACTIONS.map((group) => <ActionMenuNode key={group.type} item={group} {...props} />)
)
