import { IconArrowBadgeRight, IconBasket, IconBuildingStore, IconCategory, IconChevronUp, IconMap, IconStars, TablerIcon } from "@tabler/icons-react";
import { createLink, Link } from '@/shared/components/config/link';
import { reatomComponent } from "@reatom/npm-react";
import { CONFIG_PANEL_READ_PERMISSION, currentUserAtom, currentUserPermsAtom } from "@/shared/models/current-user.model";
import { Avatar } from "@/shared/components/app/avatar/components/avatar";
import { Button } from "@repo/ui/button";
import { Typography } from "@repo/ui/typography";
import { usePageContext } from "vike-react/usePageContext";
import { Separator } from "@repo/ui/separator";
import { atom } from "@reatom/framework";
import { Fragment } from "react/jsx-runtime";
import { isAuthAtom } from "@/shared/models/page-context.model";
import { beforeLogoutAction, logoutAction } from "../../auth/models/logout.model";
import { AlertDialog } from "@/shared/components/config/alert-dialog";
import { cartDataSelectedItemsLengthAtom, cartIsTriggeredAtom } from "../../shop/models/store-cart.model";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/dropdown-menu";
import { navigate } from "vike/client/router";

const makeMenuLink = (title: string, href: string, permission: string | null, type: "default" | "privated") =>
  ({ title, href, permission, type })

const MENU_LINKS = [
  makeMenuLink("Корзина", "/store/cart", null, "default"),
  makeMenuLink("Покупки", "/store/cart/orders", null, "default"),
  makeMenuLink("Задания", "/tasks", null, "default"),
  makeMenuLink("Рефералы", "/referrals", null, "default"),
  makeMenuLink("Системная панель", "/private", CONFIG_PANEL_READ_PERMISSION, "privated")
];

const validatedLinksAtom = atom((ctx) => {
  const opts = ctx.get(currentUserPermsAtom)

  const validatedLinks = MENU_LINKS.filter(s => {
    if (s.type === 'privated') {
      if (s.permission) {
        return opts.includes(s.permission)
      }
    }

    return true
  }) as typeof MENU_LINKS[number][]

  return validatedLinks
}, "validatedLinks")

const HeaderMenuActions = reatomComponent(({ ctx }) => {
  const handle = () => beforeLogoutAction(ctx)

  return (
    <>
      <DropdownMenuItem asChild>
        <Button
          onClick={() => navigate("/settings/main/profile")}
          className="flex items-center justify-start gap-2 hover:bg-neutral-800 w-full rounded-lg px-2 py-1"
        >
          <Typography className="font-semibold">
            Настройки
          </Typography>
        </Button>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Button
          className="flex items-center justify-start gap-2 hover:bg-neutral-800 w-full rounded-lg px-2 py-1"
          disabled={ctx.spy(logoutAction.statusesAtom).isPending}
          onClick={handle}
        >
          <Typography className="font-semibold text-red-500">
            Выйти из аккаунта
          </Typography>
        </Button>
      </DropdownMenuItem>
    </>
  )
}, "HeaderMenuActions")


const HeaderMenu = reatomComponent(({ ctx }) => {
  const links = ctx.spy(validatedLinksAtom)
  const currentUser = ctx.spy(currentUserAtom);
  if (!currentUser) return null;

  return (
    <>
      <AlertDialog />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="group w-8 flex cursor-pointer h-8 items-center justify-center">
          <IconChevronUp
            size={20}
            className="group-data-[state=open]:rotate-0 group-data-[state=closed]:rotate-180
              duration-150 ease-in-out text-neutral-400"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" className="min-w-[260px]">
          <div className="flex flex-col gap-2 w-full">
            <DropdownMenuItem asChild>
              <Button
                onClick={() => navigate(createLink("player", currentUser.nickname))}
                className="flex items-center justify-start rounded-lg p-2 hover:bg-neutral-800 w-full gap-2 overflow-hidden"
              >
                <Avatar
                  nickname={currentUser.nickname}
                  propHeight={40}
                  propWidth={40}
                  className="min-w-10 min-h-10 w-10 h-10 aspect-square"
                />
                <div className="flex flex-col justify-center items-start w-full h-10">
                  <Typography className="text-sm text-neutral-50 font-semibold leading-4 truncate">
                    {currentUser.nickname.slice(0, 32)}
                  </Typography>
                  <Typography className="text-neutral-400 leading-4 text-sm truncate">
                    игрок
                  </Typography>
                </div>
              </Button>
            </DropdownMenuItem>
            <Separator />
            {links.map((link, idx, arr) => {
              const isPrivated = link.type === 'privated'
              const firstPrivatedIndex = arr.findIndex(l => l.type === 'privated')
              const lastPrivatedIndex = arr.map(l => l.type).lastIndexOf('privated')

              return (
                <Fragment key={link.href}>
                  {isPrivated && idx === firstPrivatedIndex && <Separator />}
                  <DropdownMenuItem asChild>
                    <Button
                      onClick={() => navigate(link.href)}
                      className="flex items-center justify-start gap-2 hover:bg-neutral-800 rounded-lg px-2 py-1"
                    >
                      <Typography className="font-semibold text-neutral-200">
                        {link.title}
                      </Typography>
                    </Button>
                  </DropdownMenuItem>
                  {isPrivated && idx === lastPrivatedIndex && <Separator />}
                </Fragment>
              )
            })}
            <HeaderMenuActions />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}, "HeaderMenu")

const AuthorizeButton = () => {
  return (
    <Link
      href="/auth"
      aria-label="Авторизоваться"
      className="inline-flex items-center justify-center gap-1 h-10 min-w-10 p-0 sm:px-4 sm:py-2 bg-green-700 rounded-lg"
    >
      <Typography className="hidden sm:inline select-none font-semibold text-neutral-50 text-md sm:text-base">
        Войти
      </Typography>
      <IconArrowBadgeRight size={22} />
    </Link>
  )
}

const HeaderUser = reatomComponent(({ ctx }) => {
  const isAuth = ctx.spy(isAuthAtom)
  if (!isAuth) return <AuthorizeButton />

  const currentUser = ctx.spy(currentUserAtom);
  if (!currentUser) return null;

  return (
    <div className="flex items-center w-fit min-w-0 cursor-pointer h-10 px-2">
      <Link
        href={createLink("player", currentUser.nickname)}
        className="flex items-center gap-2 h-8 overflow-hidden"
      >
        <Avatar
          nickname={currentUser.nickname}
          propHeight={32}
          propWidth={32}
          className="min-w-8 min-h-8 w-8 h-8 aspect-square"
        />
      </Link>
      <HeaderMenu />
    </div>
  )
}, "HeaderUser")

const makeHeaderLink = (title: string, icon: TablerIcon, label: string, href: string) =>
  ({ title, icon, label, href })

const HEADERS_LINKS = [
  makeHeaderLink("Главная", IconCategory, "Перейти на главную", "/"),
  makeHeaderLink("Рейтинг", IconStars, "Перейти к рейтингу", "/ratings"),
  makeHeaderLink("Магазин", IconBasket, "Перейти к магазину", "/store"),
  makeHeaderLink("Карта", IconMap, "Перейти к карте мира", "/map"),
]

const MobileBottomBar = () => {
  return (
    <div
      className="lg:hidden z-[50] fixed flex items-center
        rounded-t-xl justify-center bottom-0 px-4 border-t border-neutral-700 bg-neutral-800 h-20 w-full"
    >
      <div className="flex items-center justify-between w-full
        gap-1 *:data-[state=inactive]:text-neutral-50 *:data-[state=active]:text-green-500"
      >
        {HEADERS_LINKS.map(link => (
          <Link key={link.title} aria-label={link.label} href={link.href} className="truncate min-w-0">
            <div className="flex items-center justify-center">
              <link.icon size={30} />
            </div>
            <span className="font-semibold text-sm">
              {link.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

const HeaderCartTrigger = reatomComponent(({ ctx }) => {
  const isTriggered = ctx.spy(cartIsTriggeredAtom);
  const cartLength = ctx.spy(cartDataSelectedItemsLengthAtom)

  return (
    <Link
      aria-label="Перейти на главную"
      href="/store/cart"
      data-trigger={isTriggered}
      className="relative max-h-8 w-8 max-w-8 flex items-center h-8 justify-center 
        data-[trigger=true]:scale-[1.15] group data-[trigger=false]:scale-100
      "
    >
      <IconBuildingStore
        size={28}
        className="group-data-[trigger=true]:text-green-500 group-data-[trigger=false]:text-neutral-400"
      />
      {cartLength >= 1 && (
        <div
          className="absolute font-semibold -bottom-1 -right-1
          bg-neutral-50 text-neutral-950 rounded-sm aspect-square w-4 h-4 flex items-center justify-center"
        >
          <span className="text-sm">{cartLength}</span>
        </div>
      )}
    </Link>
  )
}, "HeaderCartTrigger")

export const Logotype = () => {
  return (
    <Link
      aria-label="Перейти на главную"
      href="/"
      className="flex h-full w-fit items-center gap-2"
    >
      <img src="/favicon.ico" width={40} height={40} alt="" className="min-w-10 w-10 max-h-10 min-h-10" />
      <Typography className="font-[PIXY] self-end text-3xl">
        Fasberry
      </Typography>
    </Link>
  )
}

const HeaderUserBar = () => {
  const pathname = usePageContext().urlPathname;

  return (
    <div className="flex gap-4 items-center w-full justify-end">
      {pathname.includes("/store") && <HeaderCartTrigger />}
      <HeaderUser />
    </div>
  )
}

export const Header = ({ withBar = true }: { withBar?: boolean }) => {
  return (
    <>
      <MobileBottomBar />
      <div className="flex items-center justify-start w-full border-b border-neutral-800 relative z-20 h-20 top-0">
        <div className="flex items-center justify-between px-2 gap-2 sm:px-6 w-full">
          <div className="w-1/5 bg-transparent h-14 relative">
            <Logotype />
          </div>
          <div
            className="hidden lg:flex w-3/5 justify-center items-center h-20 text-neutral-400
            *:flex *:items-center *:justify-center *:border-b *:h-full *:px-10 *:hover:bg-neutral-800
            *:data-[state=inactive]:border-transparent *:data-[state=active]:border-green-500"
          >
            {HEADERS_LINKS.map(link => (
              <Link key={link.title} aria-label={link.label} href={link.href}>
                <p className="font-semibold">{link.title}</p>
              </Link>
            ))}
          </div>
          <div className="w-full md:w-1/5">
            {withBar ? (
              <HeaderUserBar />
            ) : (
              <div></div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
