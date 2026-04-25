import { IconBuildingStore, IconChevronUp } from "@tabler/icons-react";
import { createLink, Link } from '@/shared/components/config/link';
import { reatomComponent } from "@reatom/npm-react";
import { currentUserState } from "@/shared/models/current-user.model";
import { Avatar } from "@/shared/components/app/avatar/components/avatar";
import { Typography } from "@repo/ui/typography";
import { Separator } from "@repo/ui/separator";
import { Fragment } from "react/jsx-runtime";
import { cartDataSelectedItemsLengthAtom, cartState } from "../../shop/models/store-cart.model";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/dropdown-menu";
import { navigate } from "vike/client/router";
import { Logotype } from "./logotype";
import { HEADERS_LINKS, MENU_ACTIONS, MenuActionItem, MenuLink, showCartIconAtom, showCurrentUserMenuAtom, validatedLinksAtom } from "./navigation.model";
import { MobileBottomBar } from "./mobile-navigation";
import { appState } from "@/shared/models/app.model";
import { Banner } from "../../widgets/components/banner";
import { cn } from "@/shared/lib/cn";

const HeaderMenuActionItem = reatomComponent<MenuActionItem>(({ ctx, label, cb, disabled, className }) => {
  return (
    <DropdownMenuItem
      className={cn("gap-2 w-full text-neutral-400 font-semibold", className)}
      disabled={disabled?.(ctx) ?? false}
      onClick={() => cb(ctx)}
    >
      {label}
    </DropdownMenuItem>
  )
}, "HeaderMenuActionItem")

const HeaderMenuCurrentUser = reatomComponent(({ ctx }) => {
  const currentUser = ctx.spy(currentUserState);
  if (!currentUser) return null;

  return (
    <DropdownMenuItem
      className="active:scale-[0.98] min-h-10 select-none cursor-pointer py-2 bg-neutral-800 w-full overflow-hidden"
      onClick={() => navigate(createLink("player", currentUser.nickname))}
    >
      <Avatar
        nickname={currentUser.nickname}
        url={currentUser.avatar}
        className="min-w-10 w-10"
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

const HeaderMenuLinkItem = reatomComponent<MenuLink & { idx: number }>(({ ctx, type, title, idx, href }) => {
  const arr = ctx.spy(validatedLinksAtom)

  const isPrivated = type === 'privated'
  const firstPrivatedIdx = arr.findIndex(l => l.type === 'privated')
  const lastPrivatedIdx = arr.map(l => l.type).lastIndexOf('privated')

  return (
    <Fragment>
      {isPrivated && idx === firstPrivatedIdx && <Separator className="my-2" />}
      <DropdownMenuItem onClick={() => navigate(href)} className="font-semibold text-neutral-400">
        {title}
      </DropdownMenuItem>
      {isPrivated && idx === lastPrivatedIdx && <Separator className="my-2" />}
    </Fragment>
  )
}, "HeaderMenuLinkItem")

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
  const currentUser = ctx.spy(currentUserState);
  if (!currentUser) return null;

  return (
    <Link
      href={createLink("player", currentUser.nickname)}
      className="flex items-center gap-2 h-8 overflow-hidden"
    >
      <Avatar
        nickname={currentUser.nickname}
        url={currentUser.avatar}
        className="min-w-8 min-h-8 w-8 h-8 aspect-square"
      />
    </Link>
  )
}, "HeaderUserCurrentTrigger")

const HeaderCartTrigger = reatomComponent(({ ctx }) => {
  const isTriggered = ctx.spy(cartState.isTriggered);
  const cartLength = ctx.spy(cartDataSelectedItemsLengthAtom)

  return (
    <Link
      aria-label="Перейти в корзину"
      href="/store/cart"
      data-trigger={isTriggered}
      className="
        flex items-center justify-center group duration-150 max-h-6 w-6 max-w-8 aspect-square
        data-[trigger=true]:scale-[1.15] data-[trigger=false]:scale-100
      "
    >
      <IconBuildingStore
        size={24}
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

const HeaderUserMenu = reatomComponent(({ ctx }) => {
  const links = ctx.spy(validatedLinksAtom);

  return (
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
          <div className="flex flex-col gap-1 w-full">
            <HeaderMenuCurrentUser />
            <Separator className="my-2" />
            {links.map((l, idx) => <HeaderMenuLinkItem key={l.href} idx={idx} {...l} />)}
            {MENU_ACTIONS.map((a, idx) => <HeaderMenuActionItem key={idx} {...a} />)}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}, "HeaderUserMenu")

const HeaderUserBar = reatomComponent(({ ctx }) => {
  const showCurrentUserMenu = ctx.spy(showCurrentUserMenuAtom)
  const showCartIcon = ctx.spy(showCartIconAtom)

  return (
    <div className="flex gap-2 items-center w-full justify-end">
      {showCartIcon && <HeaderCartTrigger />}
      {showCurrentUserMenu ? <HeaderUserMenu /> : <AuthorizeButton />}
    </div>
  )
}, "HeaderUserBar")

export const Header = reatomComponent<{ compact?: boolean }>(({ ctx, compact = false }) => {
  const isMobile = ctx.spy(appState.isMobile)

  return (
    <div className="flex flex-col w-full border-b rounded-b-xl border-neutral-800 relative z-20">
      <div className="flex items-center justify-start w-full h-20 max-h-20 top-0">
        <div className="flex items-center justify-between px-2 gap-2 sm:px-6 h-full w-full">
          <div className="w-1/5 bg-transparent h-14 relative">
            <Logotype />
          </div>
          {!isMobile && (
            <div className="flex w-3/5 justify-center items-center h-full text-neutral-400">
              {HEADERS_LINKS.map(link => (
                <Link
                  key={link.title}
                  aria-label={link.label}
                  href={link.href}
                  className="
                    inline-flex justify-center items-center h-full px-8 border-b-2 hover:bg-neutral-800
                    data-[state=inactive]:border-transparent data-[state=active]:border-green-500
                    font-semibold text-sm truncate
                  "
                >
                  {link.title}
                </Link>
              ))}
            </div>
          )}
          <div className="w-full md:w-1/5">
            {compact ? <div /> : <HeaderUserBar />}
          </div>
        </div>
      </div>
      {!compact && <Banner />}
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