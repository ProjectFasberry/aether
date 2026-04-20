import { CONFIG_PANEL_READ_PERMISSION, currentUserPermsAtom } from "@/shared/models/current-user.model";
import { atom } from "@reatom/core";
import { IconBasket, IconCategory, IconMap, IconMountain, IconStars, TablerIcon } from "@tabler/icons-react"

const makeHeaderLink = (title: string, icon: TablerIcon, label: string, href: string) =>
  ({ title, icon, label, href })

export const HEADERS_LINKS = [
  makeHeaderLink("Главная", IconCategory, "Перейти на главную", "/"),
  makeHeaderLink("Рейтинг", IconStars, "Перейти к рейтингу", "/ratings"),
  makeHeaderLink("Магазин", IconBasket, "Перейти к магазину", "/store"),
  makeHeaderLink("Карта", IconMap, "Перейти к карте мира", "/map"),
  makeHeaderLink("Регионы", IconMountain, "Перейти к регионам", "/lands")
]

const makeMenuLink = (title: string, href: string, permission: string | null, type: "default" | "privated") =>
  ({ title, href, permission, type })

const MENU_LINKS = [
  makeMenuLink("Корзина", "/store/cart", null, "default"),
  makeMenuLink("Покупки", "/store/cart/orders", null, "default"),
  makeMenuLink("Задания", "/tasks", null, "default"),
  makeMenuLink("Рефералы", "/referrals", null, "default"),
  makeMenuLink("Системная панель", "/private", CONFIG_PANEL_READ_PERMISSION, "privated")
];

export const validatedLinksAtom = atom((ctx) => {
  const opts = ctx.get(currentUserPermsAtom)

  const validatedLinks = MENU_LINKS.filter(s => {
    if (s.type === 'privated' && s.permission) return opts.includes(s.permission)

    return true
  }) as typeof MENU_LINKS[number][]

  return validatedLinks
}, "validatedLinks")