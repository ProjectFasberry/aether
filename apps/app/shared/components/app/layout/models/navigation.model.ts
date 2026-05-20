import { CONFIG_PANEL_READ_PERMISSION, currentUserState } from "@/shared/models/current-user/index.model";
import { action, type Action, atom, type CtxSpy } from "@reatom/framework";
import { IconBasket, IconCategory, IconMap, IconMountain, IconStars } from "@tabler/icons-react"
import { settingsState } from "../../settings/models/settings.model";
import { logout } from "../../auth/models/logout.model";
import { pageState } from "@/shared/models/page-context.model";
import { translate } from "@/shared/locales/helpers";
import { userState } from "@/shared/models/app/index.model";

const HEADERS_LINKS = [
  { title: translate["shared.header.links.main.value"](), icon: IconCategory, label: translate["shared.header.links.main.label"](), href: "/" },
  { title: translate["shared.header.links.ratings.value"](), icon: IconStars, label: translate["shared.header.links.ratings.value"](), href: "/ratings" },
  { title: translate["shared.header.links.store.value"](), icon: IconBasket, label: translate["shared.header.links.store.value"](), href: "/store" },
  { title: translate["shared.header.links.map.value"](), icon: IconMap, lable: translate["shared.header.links.map.value"](), href: "/map" },
  { title: translate["shared.header.links.lands.value"](), icon: IconMountain, label: translate["shared.header.links.lands.value"](), href: "/lands" }
]
const HEADER_MENU_LINKS = [
  { title: translate["shared.header.menu.cart"](), type: "default", href: "/store/cart", },
  { title: translate["shared.header.menu.orders"](), type: "default", href: "/store/cart/orders", },
  { title: translate["shared.header.menu.tasks"](), type: "default", href: "/tasks", },
  { title: translate["shared.header.menu.referrals"](), type: "default", href: "/referrals", },
  { title: translate["shared.header.menu.private"](), permission: CONFIG_PANEL_READ_PERMISSION, type: "privated", href: "/private", }
];

export type MenuLink = typeof HEADER_MENU_LINKS[number]

export const validatedLinksAtom = atom((ctx) => {
  const perms = ctx.get(currentUserState.perms)

  const validatedLinks = HEADER_MENU_LINKS.filter(s => {
    if (s.type === 'privated' && s.permission) {
      return perms.includes(s.permission)
    }
    return true
  })

  return validatedLinks
})

export type MenuActionItem = {
  cb: Action<[], void>;
  label: string;
  className?: string;
  disabled?: (ctx: CtxSpy) => boolean;
};

const MENU_ACTIONS: MenuActionItem[] = [
  {
    label: translate["shared.header.menu.settings"](),
    cb: action((ctx) => void settingsState.isOpen(ctx, true)),
  },
  {
    label: translate["shared.header.menu.logout"](),
    className: "text-red hover:bg-red/60!",
    disabled: (ctx) => ctx.spy(logout.exec.statusesAtom).isPending,
    cb: logout.withConfirm,
  },
]

const showCurrentUserMenuAtom = atom((ctx) => ctx.spy(userState.isAuthed) && ctx.spy(pageState.urlPathname) !== "/auth")
const showCartIconAtom = atom((ctx) => ctx.spy(userState.isAuthed) && ctx.spy(pageState.urlPathname)?.includes("/store"))
const showAuthorizeButtonAtom = atom((ctx) => ctx.spy(pageState.urlPathname) !== "/auth");

const headerUserMenuIsOpenAtom = atom(false, "headerUserMenuIsOpen")

export const navigationModel = () => {
  return {
    showCurrentUserMenuAtom,
    showCartIconAtom,
    headerUserMenuIsOpenAtom,
    showAuthorizeButtonAtom,
    MENU_ACTIONS,
    HEADERS_LINKS,
    HEADER_MENU_LINKS
  }
}
