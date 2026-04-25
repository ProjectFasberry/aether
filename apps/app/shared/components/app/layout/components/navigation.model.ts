import { CONFIG_PANEL_READ_PERMISSION, currentUserState } from "@/shared/models/current-user.model";
import { action, Action, atom, CtxSpy } from "@reatom/core";
import { IconBasket, IconCategory, IconMap, IconMountain, IconStars, TablerIcon } from "@tabler/icons-react"
import { settingsState } from "../../settings/models/settings.model";
import { logout } from "../../auth/models/logout.model";
import { isAuthedAtom, pageContextAtom } from "@/shared/models/page-context.model";

const makeHeaderLink = (title: string, icon: TablerIcon, label: string, href: string) =>
  ({ title, icon, label, href })
const makeMenuLink = (title: string, href: string, permission: string | null, type: "default" | "privated") =>
  ({ title, href, permission, type })

export const HEADERS_LINKS = [
  makeHeaderLink("Главная", IconCategory, "Перейти на главную", "/"),
  makeHeaderLink("Рейтинг", IconStars, "Перейти к рейтингу", "/ratings"),
  makeHeaderLink("Магазин", IconBasket, "Перейти к магазину", "/store"),
  makeHeaderLink("Карта", IconMap, "Перейти к карте мира", "/map"),
  makeHeaderLink("Регионы", IconMountain, "Перейти к регионам", "/lands")
]
export const HEADER_MENU_LINKS = [
  makeMenuLink("Корзина", "/store/cart", null, "default"),
  makeMenuLink("Покупки", "/store/cart/orders", null, "default"),
  makeMenuLink("Задания", "/tasks", null, "default"),
  makeMenuLink("Рефералы", "/referrals", null, "default"),
  makeMenuLink("Системная панель", "/private", CONFIG_PANEL_READ_PERMISSION, "privated")
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

export type MenuActionItem = {
  label: string,
  className?: string,
  disabled?: (ctx: CtxSpy) => boolean,
  cb: Action<[], void>
}

export const MENU_ACTIONS: MenuActionItem[] = [
  {
    label: "Настройки",
    cb: action((ctx) => void settingsState.dialogIsOpen(ctx, true))
  },
  {
    label: "Выйти", 
    className: "text-red hover:bg-red/60!",
    disabled: (ctx) => ctx.spy(logout.exec.statusesAtom).isPending,
    cb: logout.withConfirm
  }
]

export const showCurrentUserMenuAtom = atom((ctx) => {
  const pathname = ctx.spy(pageContextAtom)?.urlPathname
  const isNonAuthPage = pathname === "/auth/"
  const isAuthed = ctx.spy(isAuthedAtom)
  return isAuthed && !isNonAuthPage
})

export const showCartIconAtom = atom((ctx) => {
  const pathname = ctx.spy(pageContextAtom)?.urlPathname
  const isAuthed = ctx.spy(isAuthedAtom)
  const isStorePage = pathname?.includes("/store");
  return isAuthed && isStorePage
})