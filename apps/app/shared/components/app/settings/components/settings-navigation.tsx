import {
  IconAspectRatio, IconBuildingStore, IconDeviceDesktop, IconLink, IconLogout2, IconShieldHalfFilled, IconUserCircle,
  type TablerIcon
} from "@tabler/icons-react"
import {
  settings, SETTINGS_NAVIGATION, settingsNavigationItemIsActiveAtom,
  type SettingsNavigation, type SettingsNavigationNode, type SettingsParent
} from "../models/settings.model"
import { tv } from "tailwind-variants"
import { reatomComponent } from "@reatom/npm-react"
import { Button } from "@/shared/ui/button"
import { type Ctx, spawn } from "@reatom/framework"

type SettingsNavigationItem = { icon: TablerIcon, className?: string }

const SETTINGS_NAVIGATION_ICONS: Partial<Record<SettingsParent, Record<string, SettingsNavigationItem>>> = {
  main: {
    account: { icon: IconUserCircle },
    devices: { icon: IconDeviceDesktop },
    security: { icon: IconShieldHalfFilled },
    connections: { icon: IconLink },
    store: { icon: IconBuildingStore }
  },
  app: {
    appearance: { icon: IconAspectRatio }
  },
  account: {
    logout: {
      className: "text-red", icon: IconLogout2
    }
  }
}

const navigationItemNodeVariant = tv({
  base: `flex items-center group font-medium truncate rounded-lg gap-2 h-10 px-2 justify-start`,
  variants: {
    variant: {
      default: "hover:bg-neutral-700", active: "bg-neutral-700"
    }
  },
  defaultVariants: {
    variant: "default"
  }
})

type Handler = (ctx: Ctx, node: SettingsNavigationNode, parent: SettingsParent) => void;

const AS_EVENTS: Record<NonNullable<SettingsNavigationNode["as"]>, Handler> = {
  "button": (ctx, node) => spawn(ctx, (spawnCtx) => node.cb?.(spawnCtx)),
  "link": (ctx, node, parent) => settings.navigate(ctx, parent, node.value)
}

const NavigationItemNode = reatomComponent<{ parent: SettingsParent, node: SettingsNavigationNode }>(({
  ctx, node, parent
}) => {
  const isActive = ctx.spy(settingsNavigationItemIsActiveAtom(parent, node.value))
  const variant = isActive ? "active" : "default"

  const Icon: TablerIcon | undefined = SETTINGS_NAVIGATION_ICONS[parent]?.[node.value]?.icon
  const className = SETTINGS_NAVIGATION_ICONS[parent]?.[node.value]?.className

  return (
    <Button
      data-sound={true}
      onClick={() => AS_EVENTS[node.as ?? "link"](ctx, node, parent)}
      className={navigationItemNodeVariant({ variant, className })}
    >
      {Icon && <Icon size={20} />}
      {node.title}
    </Button>
  )
}, "NavigationItemNode")

const NavigationItem = ({ parent, title, nodes }: SettingsNavigation & { parent: SettingsParent }) => {
  return (
    <div className="flex flex-col gap-2">
      {title && (
        <h2 className="font-semibold line-clamp-2 leading-4 text-sm text-neutral-400">
          {title}
        </h2>
      )}
      <div className="flex flex-col gap-1">
        {nodes.map((node) => (
          <NavigationItemNode key={`${parent}/${node.value}`} parent={parent} node={node} />
        ))}
      </div>
    </div>
  )
}

const SettingsNavigationList = () => Object.entries(SETTINGS_NAVIGATION).map(([key, section]) => (
  <NavigationItem key={key} parent={key as SettingsParent} {...section} />
))
export const SettingsNavigationDesktop = () => {
  return (
    <div className="flex flex-col w-full gap-6">
      <SettingsNavigationList />
    </div>
  )
}
export const SettingsNavigationMobile = () => {
  return (
    <div className="flex flex-col gap-6 mt-4 w-full h-full overflow-x-hidden overflow-y-auto">
      <SettingsNavigationList />
    </div>
  )
}
