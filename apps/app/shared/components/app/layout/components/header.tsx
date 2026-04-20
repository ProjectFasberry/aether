import { IconBuildingStore, IconChevronUp } from "@tabler/icons-react";
import { createLink, Link } from '@/shared/components/config/link';
import { reatomComponent } from "@reatom/npm-react";
import { currentUserAtom } from "@/shared/models/current-user.model";
import { Avatar } from "@/shared/components/app/avatar/components/avatar";
import { Typography } from "@repo/ui/typography";
import { usePageContext } from "vike-react/usePageContext";
import { Separator } from "@repo/ui/separator";
import { Fragment } from "react/jsx-runtime";
import { isAuthedAtom } from "@/shared/models/page-context.model";
import { logout } from "../../auth/models/logout.model";
import { cartDataSelectedItemsLengthAtom, cartIsTriggeredAtom } from "../../shop/models/store-cart.model";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/dropdown-menu";
import { navigate } from "vike/client/router";
import { Logotype } from "./logotype";
import { HEADERS_LINKS, validatedLinksAtom } from "./navigation.model";
import { settingsState } from "../../settings/models/settings.model";
import { MobileBottomBar } from "./mobile-navigation";
import { appState } from "@/shared/models/app.model";

const HeaderMenuActions = reatomComponent(({ ctx }) => {
  return (
    <>
      <DropdownMenuItem
        className="gap-2 hover:bg-neutral-800 w-full"
        onClick={() => settingsState.dialogIsOpen.toggle(ctx, true)}
      >
        <Typography className="font-semibold">
          Настройки
        </Typography>
      </DropdownMenuItem>
      <DropdownMenuItem
        className="gap-2 hover:bg-neutral-800 w-full"
        disabled={ctx.spy(logout.exec.statusesAtom).isPending}
        onClick={() => logout.withConfirm(ctx)}
      >
        <Typography className="font-semibold text-red-500">
          Выйти из аккаунта
        </Typography>
      </DropdownMenuItem>
    </>
  )
}, "HeaderMenuActions")

const HeaderMenuCurrentUser = reatomComponent(({ ctx }) => {
  const currentUser = ctx.spy(currentUserAtom);
  if (!currentUser) return null;

  return (
    <DropdownMenuItem
      className="active:scale-[0.98] select-none cursor-pointer py-2 bg-neutral-800 w-full overflow-hidden"
      onClick={() => navigate(createLink("player", currentUser.nickname))}
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
    </DropdownMenuItem>
  )
}, "HeaderMenuCurrentUser")

const HeaderMenuLinks = reatomComponent(({ ctx }) => {
  const links = ctx.spy(validatedLinksAtom)

  return (
    links.map((link, idx, arr) => {
      const isPrivated = link.type === 'privated'
      const firstPrivatedIndex = arr.findIndex(l => l.type === 'privated')
      const lastPrivatedIndex = arr.map(l => l.type).lastIndexOf('privated')

      return (
        <Fragment key={link.href}>
          {isPrivated && idx === firstPrivatedIndex && <Separator />}
          <DropdownMenuItem onClick={() => navigate(link.href)}>
            <Typography className="font-semibold text-neutral-200">
              {link.title}
            </Typography>
          </DropdownMenuItem>
          {isPrivated && idx === lastPrivatedIndex && <Separator />}
        </Fragment>
      )
    })
  )
}, "HeaderMenuLinks")

const AuthorizeButton = () => {
  return (
    <Link
      href="/auth"
      aria-label="Вход"
      className="flex items-center justify-center gap-1 h-9 min-w-10 px-4 py-2 bg-green-600 rounded-xl"
    >
      <Typography className="leading-5 font-semibold select-none text-neutral-50 text-sm">
        Вход
      </Typography>
    </Link>
  )
}

const HeaderUserCurrentTrigger = reatomComponent(({ ctx }) => {
  const currentUser = ctx.spy(currentUserAtom);
  if (!currentUser) return null;

  return (
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
  )
}, "HeaderUserCurrentTrigger")

const HeaderCartTrigger = reatomComponent(({ ctx }) => {
  const isTriggered = ctx.spy(cartIsTriggeredAtom);
  const cartLength = ctx.spy(cartDataSelectedItemsLengthAtom)

  return (
    <Link
      aria-label="Перейти в корзину"
      href="/store/cart"
      data-trigger={isTriggered}
      className="
        flex items-center justify-center group duration-150 max-h-8 w-8 max-w-8 h-8 
        data-[trigger=true]:scale-[1.15] data-[trigger=false]:scale-100
      "
    >
      <IconBuildingStore
        size={28}
        className="group-data-[trigger=true]:text-green-500 group-data-[trigger=false]:text-neutral-400"
      />
      {cartLength > 0 && (
        <div
          className="absolute font-semibold -bottom-1 -right-1
          bg-neutral-50 text-neutral-950 rounded-sm aspect-square w-4 h-4 flex items-center justify-center"
        >
          <span className="text-[12px] leading-none">{cartLength}</span>
        </div>
      )}
    </Link>
  )
}, "HeaderCartTrigger")

const HeaderUserBar = reatomComponent(({ ctx }) => {
  const pathname = usePageContext().urlPathname;

  const isAuthed = ctx.spy(isAuthedAtom)
  const isNonAuthPage = pathname === "/auth/"
  const showCurrentUserMenu = isAuthed && !isNonAuthPage

  return (
    <div className="flex gap-4 items-center w-full justify-end">
      {pathname.includes("/store") && <HeaderCartTrigger />}
      {showCurrentUserMenu ? (
        <div className="flex items-center w-fit min-w-0 cursor-pointer h-10 px-2">
          <HeaderUserCurrentTrigger />
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="group cursor-pointer h-8 w-8 flex items-center justify-center">
              <IconChevronUp
                size={20}
                className="group-data-[state=open]:rotate-0 group-data-[state=closed]:rotate-180 duration-100 text-neutral-400"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="min-w-[260px]">
              <div className="flex flex-col gap-2 w-full">
                <HeaderMenuCurrentUser />
                <Separator />
                <HeaderMenuLinks />
                <HeaderMenuActions />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <AuthorizeButton />
      )}
    </div>
  )
}, "HeaderUserBar")

const HeaderLinks = () => {
  return (
    <div className="flex w-3/5 justify-center items-center h-full text-neutral-400">
      {HEADERS_LINKS.map(link => (
        <Link
          key={link.title}
          aria-label={link.label}
          href={link.href}
          className="inline-flex justify-center items-center border-b h-full px-10 hover:bg-neutral-800
                data-[state=inactive]:border-transparent data-[state=active]:border-green-500"
        >
          <p className="font-semibold text-[14px]">{link.title}</p>
        </Link>
      ))}
    </div>
  )
}

export const Header = reatomComponent<{ withBar?: boolean }>(({ ctx, withBar = true }) => {
  const isMobile = ctx.spy(appState.isMobile)

  return (
    <div className="flex items-center justify-start w-full border-b rounded-b-xl border-neutral-800 relative z-20 h-20 max-h-20 top-0">
      <div className="flex items-center justify-between px-2 gap-2 sm:px-6 h-full w-full">
        <div className="w-1/5 bg-transparent h-14 relative">
          <Logotype />
        </div>
        {!isMobile && <HeaderLinks />}
        <div className="w-full md:w-1/5">
          {withBar ? (
            <HeaderUserBar />
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </div>
  )
}, "Header")

export const Navigation = reatomComponent(({ ctx }) => {
  const isMobile = ctx.spy(appState.isMobile)

  return (
    <>
      {isMobile && <MobileBottomBar />}
      <Header />
    </>
  )
}, "Navigation")