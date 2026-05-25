import { IconBuildingStore, IconMenu, IconX } from "@tabler/icons-react";
import { createLink, Link } from '@/shared/components/config/link';
import { reatomComponent } from "@reatom/npm-react";
import { currentUserState } from "@/shared/models/current-user/index.model";
import { Avatar } from "@/shared/ui/avatar";
import { Typography } from "@/shared/ui/typography"
import { Separator } from "@/shared/ui/separator";
import { cartDataSelectedItemsLengthAtom, cartState } from "../../shop/models/store-cart.model";
import { navigate } from "vike/client/router";
import { Logotype } from "./logotype";
import { navigationModel, type MenuActionItem as MenuActionItemType, type MenuLink, validatedLinksAtom } from "../models/navigation.model";
import { MobileBottomBar } from "./mobile-navigation";
import { appState } from "@/shared/models/app/index.model";
import { Banner } from "../../widgets/components/banner";
import { cn } from "@/shared/lib/cn";
import { translate } from "@/shared/locales/helpers";
import { Vaul, VaulContent, VaulTrigger } from "@/shared/ui/vaul";
import { action } from "@reatom/framework";
import { dropdownMenuItemVariants } from "@/shared/ui/menu";
import { Menu, type MenuItemProps } from '@ark-ui/react/menu'
import { menuArrowTipVariant, menuArrowVariant, menuContentVariant, menuTriggerVariant } from "@/shared/ui/menu";

const {
  HEADERS_LINKS, headerUserMenuIsOpenAtom, MENU_ACTIONS, showCartIconAtom, showCurrentUserMenuAtom, showAuthorizeButtonAtom
} = navigationModel()

type ItemVariant = "menu" | "drawer";

const MenuActionItem = reatomComponent<MenuActionItemType & { variant: ItemVariant }>(({
  ctx, label, cb, variant, disabled, className
}) => {
  const { Item, itemProps } = defineItem(variant, {
    onClick: () => cb(ctx),
    className: cn("gap-2 w-full font-semibold", className),
    disabled: disabled?.(ctx) ?? false,
    value: label
  })

  return <Item {...itemProps} data-sound={true}>{label}</Item>
}, "MenuActionItem")

const MenuCurrentUser = reatomComponent<{ variant: ItemVariant }>(({ ctx, variant }) => {
  const currentUser = ctx.spy(currentUserState);
  if (!currentUser) return null;

  const { Item, itemProps } = defineItem(variant, {
    className: "active:scale-[0.98] min-h-10 select-none cursor-pointer rounded-lg p-2 bg-neutral-800 w-full overflow-hidden flex gap-2 items-center",
    onClick: () => navigate(createLink("player", currentUser.nickname)),
    value: "current-user"
  })

  return (
    <Item {...itemProps}>
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
    </Item>
  )
}, "MenuCurrentUser")

function defineItem<T extends ItemVariant>(variant: T, props: MenuItemProps) {
  const Item = variant === 'drawer' ? "div" : Menu.Item
  return {
    Item,
    itemProps: { ...props, className: dropdownMenuItemVariants({ className: props?.className }) }
  };
}

const MenuLinkItem = reatomComponent<MenuLink & { idx: number, variant: ItemVariant }>(({
  ctx, variant, type, title, idx, href
}) => {
  const data = ctx.spy(validatedLinksAtom)
  const firstPrivatedIdx = data.findIndex(link => link.type === 'privated')
  const lastPrivatedIdx = data.map(link => link.type).lastIndexOf('privated')
  const showSepartor = type === 'privated' && idx;

  const { Item, itemProps } = defineItem(variant, {
    className: "font-semibold",
    onClick: () => navigate(href),
    value: href
  })

  return (
    <>
      {showSepartor === firstPrivatedIdx && <Separator className="my-2" />}
      <Item {...itemProps} data-sound={true}>{title}</Item>
      {showSepartor === lastPrivatedIdx && <Separator className="my-2" />}
    </>
  )
}, "MenuLinkItem")

const AuthorizeButton = () => {
  return (
    <Link
      href="/auth"
      aria-label={translate["shared.header.authorizeTitle"]()}
      className="flex items-center justify-center gap-1 h-9 min-w-10 px-4 py-2 bg-green-600 rounded-xl"
    >
      <Typography className="leading-5 font-semibold select-none text-neutral-50 text-sm">
        {translate["shared.header.authorizeTitle"]()}
      </Typography>
    </Link>
  )
}

const UserCurrentTrigger = reatomComponent(({ ctx }) => {
  const currentUser = ctx.spy(currentUserState);
  if (!currentUser) return null;

  return (
    <Link
      href={createLink("player", currentUser.nickname)}
      className="flex items-center gap-2 h-8 overflow-hidden"
    >
      <Avatar
        nickname={currentUser.nickname} url={currentUser.avatar} className="min-w-8 w-8"
      />
    </Link>
  )
}, "UserCurrentTrigger")

const syncCartTrigger = action((ctx) => (el: Nullable<HTMLAnchorElement>) => {
  if (!el) return;

  return ctx.subscribe(cartState.isTriggered, (state) => {
    el.dataset.trigger = String(state)
  })
})

const CartTrigger = reatomComponent(({ ctx }) => {
  const showCartIcon = ctx.spy(showCartIconAtom)
  if (!showCartIcon) return null;

  const cartItemsLength = ctx.spy(cartDataSelectedItemsLengthAtom)
  const initial = ctx.get(cartState.isTriggered);

  return (
    <Link
      aria-label="Перейти в корзину"
      href="/store/cart"
      data-trigger={initial}
      className="
        flex items-center justify-center group duration-150 max-h-6 w-6 aspect-square
        data-[trigger=true]:scale-[1.15] font-semibold data-[trigger=false]:scale-100
      "
      ref={syncCartTrigger(ctx)}
    >
      <IconBuildingStore
        size={24}
        className="group-data-[trigger=true]:text-green-500 group-data-[trigger=false]:text-neutral-400"
      />
      {cartItemsLength > 0 && (
        <div
          className="
            flex items-center justify-center absolute -bottom-1 -right-1
            bg-neutral-50 text-[12px] leading-none text-neutral-950 rounded-sm
            aspect-square min-w-4 w-4
          "
        >
          {cartItemsLength}
        </div>
      )}
    </Link>
  )
}, "CartTrigger")

const syncState = action((ctx) => (el: Nullable<HTMLDivElement>) => {
  if (!el) return;

  return ctx.subscribe(headerUserMenuIsOpenAtom, (state) => {
    el.dataset.active = String(state)
  });
})

const USER_MENU_TRIGGER_ICONS = [{ icon: IconX, value: true }, { icon: IconMenu, value: false }];

const UserMenuTrigger = reatomComponent(({ ctx }) => {
  const initial = ctx.get(headerUserMenuIsOpenAtom);

  return (
    <div
      data-active={initial}
      className="
        flex items-center justify-center group hover:bg-neutral-800
        bg-neutral-900 text-neutral-400 rounded-lg cursor-pointer h-8 w-8
      "
      ref={syncState(ctx)}
    >
      {USER_MENU_TRIGGER_ICONS.map(({ icon: Icon, value }, idx) => (
        <Icon
          key={idx}
          data-sound={true}
          size={20}
          className={`absolute duration-300 opacity-0 ${value
            ? "group-data-[active=true]:opacity-100" : "group-data-[active=false]:opacity-100"
            }`}
        />
      ))}
    </div>
  )
}, "UserMenuTrigger")

const UserMenuContent = reatomComponent<{ variant: ItemVariant }>(({ ctx, variant }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <MenuCurrentUser variant={variant} />
      <Separator className="my-2" />
      {ctx.spy(validatedLinksAtom).map((link, idx) => (
        <MenuLinkItem variant={variant} key={link.href} idx={idx} {...link} />)
      )}
      {MENU_ACTIONS.map((action, idx) => (
        <MenuActionItem variant={variant} key={idx} {...action} />
      ))}
    </div>
  )
}, "UserMenuContent")

const UserMenuVaul = () => {
  return (
    <Vaul openAtom={headerUserMenuIsOpenAtom}>
      <VaulTrigger>
        <UserMenuTrigger />
      </VaulTrigger>
      <VaulContent>
        <UserMenuContent variant="drawer" />
      </VaulContent>
    </Vaul>
  )
}

const UserMenuDropdown = reatomComponent(({ ctx }) => {
  return (
    <Menu.Root
      open={ctx.spy(headerUserMenuIsOpenAtom)}
      positioning={{ placement: "bottom-end" }}
      onOpenChange={(details) => headerUserMenuIsOpenAtom(ctx, details.open)}
    >
      <Menu.Trigger className={menuTriggerVariant()}>
        <UserMenuTrigger />
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content className={menuContentVariant({ className: "min-w-[240px]" })}>
          <Menu.Arrow className={menuArrowVariant()}>
            <Menu.ArrowTip className={menuArrowTipVariant()} />
          </Menu.Arrow>
          <UserMenuContent variant="menu" />
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  )
}, "UserMenuDropdown");

const UserMenu = reatomComponent(({ ctx }) => {
  return (
    <div className="flex items-center w-fit gap-2 min-w-0 h-10 px-2">
      <UserCurrentTrigger />
      {ctx.spy(appState.current.isMobile) ? <UserMenuVaul /> : <UserMenuDropdown />}
    </div>
  )
}, "UserMenu")

const UserBar = reatomComponent(({ ctx }) => {
  return (
    <div className="flex gap-2 items-center w-full justify-end">
      <CartTrigger />
      {ctx.spy(showCurrentUserMenuAtom) ? <UserMenu /> :
        ctx.spy(showAuthorizeButtonAtom) ? <AuthorizeButton /> : null
      }
    </div>
  )
}, "UserBar")

const LinkItem = ({ title, label, href }: typeof HEADERS_LINKS[number]) => {
  return (
    <Link
      aria-label={label}
      href={href}
      className="
        inline-flex justify-center items-center h-full px-8 border-b-2 hover:bg-neutral-800
        data-[state=inactive]:border-transparent data-[state=active]:border-green-500
        font-semibold text-sm truncate
      "
    >
      {title}
    </Link>
  )
}

export const Header = reatomComponent<{ asCompact?: boolean }>(({ ctx, asCompact = false }) => {
  return (
    <div className="flex flex-col w-full border-b rounded-b-xl border-neutral-800 relative z-20">
      <div className="flex items-center justify-start w-full h-20 max-h-20 top-0">
        <div className="flex items-center justify-between px-2 gap-2 sm:px-6 h-full w-full">
          <div className="w-1/5 bg-transparent h-14 relative">
            <Logotype />
          </div>
          {!ctx.spy(appState.current.isMobile) && (
            <div className="flex w-3/5 justify-center items-center h-full text-neutral-400">
              {HEADERS_LINKS.map((link, idx) => <LinkItem key={idx} {...link} />)}
            </div>
          )}
          <div className="w-full md:w-1/5">
            {asCompact ? <div /> : <UserBar />}
          </div>
        </div>
      </div>
      {!asCompact && <Banner />}
    </div>
  )
}, "Header")

export const Navigation = reatomComponent(({ ctx }) => (
  <>
    {ctx.spy(appState.current.isMobile) && <MobileBottomBar />}
    <Header />
  </>
), "Navigation")
