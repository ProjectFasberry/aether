import { CONFIG_PANEL_READ_PERMISSION, currentUserState } from "@/shared/models/current-user/index.model";
import { action, type Action, atom, type AtomMut, type CtxSpy } from "@reatom/framework";
import { IconBasket, IconCategory, IconMap, IconMountain, IconStars, type TablerIcon } from "@tabler/icons-react"
import { settingsState } from "../../settings/models/settings.model";
import { logout } from "../../auth/models/logout.model";
import { pageState } from "@/shared/models/page-context.model";
import { translate } from "@/shared/locales/helpers";
import { userState } from "@/shared/models/app/index.model";

const makeHeaderLink = (title: string, icon: TablerIcon, label: string, href: string) =>
  ({ title, icon, label, href })
const makeMenuLink = (title: string, href: string, permission: string | null, type: "default" | "privated") =>
  ({ title, href, permission, type })

export const HEADERS_LINKS = [
  makeHeaderLink(translate["shared.header.links.main.value"](), IconCategory, translate["shared.header.links.main.label"](), "/"),
  makeHeaderLink(translate["shared.header.links.ratings.value"](), IconStars, translate["shared.header.links.ratings.value"](), "/ratings"),
  makeHeaderLink(translate["shared.header.links.store.value"](), IconBasket, translate["shared.header.links.store.value"](), "/store"),
  makeHeaderLink(translate["shared.header.links.map.value"](), IconMap, translate["shared.header.links.map.value"](), "/map"),
  makeHeaderLink(translate["shared.header.links.lands.value"](), IconMountain, translate["shared.header.links.lands.value"](), "/lands")
]
export const HEADER_MENU_LINKS = [
  makeMenuLink(translate["shared.header.menu.cart"](), "/store/cart", null, "default"),
  makeMenuLink(translate["shared.header.menu.orders"](), "/store/cart/orders", null, "default"),
  makeMenuLink(translate["shared.header.menu.tasks"](), "/tasks", null, "default"),
  makeMenuLink(translate["shared.header.menu.referrals"](), "/referrals", null, "default"),
  makeMenuLink(translate["shared.header.menu.private"](), "/private", CONFIG_PANEL_READ_PERMISSION, "privated")
];

export type MenuLink = typeof HEADER_MENU_LINKS[number]

export const validatedLinksAtom = atom((ctx) => {
  const perms = ctx.get(currentUserState.perms)

  const validatedLinks = HEADER_MENU_LINKS.filter(s => {
    if (s.type === 'privated' && s.permission) {
      return perms.includes(s.permission)
    }
    return true
  }) as typeof HEADER_MENU_LINKS[number][]

  return validatedLinks
})

export type MenuActionItem = ButtonMenuItem | SwitchMenuItem

type BaseMenuItem = {
  label: string;
  className?: string;
  disabled?: (ctx: CtxSpy) => boolean;
};

type ButtonMenuItem = BaseMenuItem & {
  type: "button";
  cb: Action<[], void>;
  value?: never;
};

type SwitchMenuItem = BaseMenuItem & {
  type: "switch";
  value: AtomMut<boolean>;
  cb: Action<[], void>;
};

export const MENU_ACTIONS: MenuActionItem[] = [
  {
    label: translate["shared.header.menu.settings"](),
    cb: action((ctx) => void settingsState.isOpen(ctx, true)),
    type: "button"
  },
  {
    label: translate["shared.header.menu.logout"](),
    className: "text-red hover:bg-red/60!",
    disabled: (ctx) => ctx.spy(logout.exec.statusesAtom).isPending,
    cb: logout.withConfirm,
    type: "button"
  },
]

export const showCurrentUserMenuAtom = atom((ctx) => {
  const isNonAuthPage = ctx.spy(pageState.urlPathname) === "/auth/"
  const isAuthed = ctx.spy(userState.isAuthed)
  return isAuthed && !isNonAuthPage
})

export const showCartIconAtom = atom((ctx) => {
  const isAuthed = ctx.spy(userState.isAuthed)
  const isStorePage = ctx.spy(pageState.urlPathname)?.includes("/store");
  return isAuthed && isStorePage
})