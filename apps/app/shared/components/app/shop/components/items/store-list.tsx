import { Typography } from "@repo/ui/typography"
import { reatomComponent } from "@reatom/npm-react"
import { Skeleton } from "@repo/ui/skeleton"
import { storeItemsDataAtom, storeItemsIsPendingAtom } from "../../models/store.model"
import { createLink } from "@/shared/components/config/link"
import { Button } from "@repo/ui/button"
import { tv } from "tailwind-variants"
import { getStaticImage } from "@/shared/lib/volume-helpers"
import { isClientAtom } from "@/shared/models/page-context.model"
import { getItemStatus, handleItemToCart } from "../../models/store-item.model"
import { CURRENCIES } from "../cart/cart-price"
import type { StoreItem } from "@repo/shared/types/entities/store"

const buyButtonVariants = tv({
  base: `group gap-2 duration-150 h-10 *:duration-150 px-6 w-full rounded-xl`,
  variants: {
    variant: {
      active: "bg-neutral-50 hover:bg-neutral-200",
      inactive: "bg-[#35C759]/80"
    }
  },
  defaultVariants: {
    variant: "inactive"
  }
})

const buyButtonTypographyVariants = tv({
  base: `font-semibold text-base text-nowrap`,
  variants: {
    variant: {
      active: "text-neutral-900",
      inactive: "text-neutral-50"
    }
  },
  defaultVariants: {
    variant: "inactive"
  }
})

export const storeItemVariant = tv({
  base: `flex flex-col items-center w-full overflow-hidden rounded-xl justify-between gap-2 p-2 sm:p-4 relative`,
  variants: {
    variant: {
      default: "bg-gradient-to-b from-neutral-700/80 via-neutral-700/70 to-neutral-700/60"
    }
  },
  slots: {
    avatarImg: "min-h-16 min-w-16",
    info: "flex flex-col w-full gap-1 overflow-hidden justify-center relative z-[2] items-center",
    footer: "flex flex-col mt-0 sm:mt-2 items-center relative z-[2] justify-center w-full gap-2",
    title: "text-lg lg:text-xl leading-tight font-semibold truncate text-white w-full text-center block whitespace-nowrap",
    summary: "truncate h-5 relative -top-1 text-xs sm:text-sm w-full text-center",
    priceWrapper: "flex items-center justify-center h-9 py-1 px-4 rounded-full"
  },
  defaultVariants: {
    variant: "default"
  }
})

export const ItemPrice = ({ currency, price }: { currency: string, price: string | number }) => {
  return (
    <div className="flex items-center gap-1 text-base select-none text-nowrap font-semibold">
      <Typography>
        {price}
      </Typography>
      {CURRENCIES[currency].img ? (
        <img
          src={CURRENCIES[currency].img}
          draggable={false}
          alt={CURRENCIES[currency].symbol}
          width={24}
          height={24}
        />
      ) : (
        <span>{CURRENCIES[currency].symbol}</span>
      )}
    </div>
  )
}

export const ItemSelectToCart = reatomComponent<Pick<StoreItem, "id">>(({ ctx, id }) => {
  if (!ctx.spy(isClientAtom)) {
    return <Skeleton className="h-10 w-24" />
  }

  const state = ctx.spy(getItemStatus(id))

  const isLoading = state?.isLoading ?? false
  const isSelected = state?.isSelected ?? false;

  const variant: "active" | "inactive" = isSelected ? "active" : "inactive"

  return (
    <Button
      className={buyButtonVariants({ variant })}
      disabled={isLoading}
      onClick={() => handleItemToCart(ctx, id)}
      withSpinner={true}
      isLoading={isLoading}
    >
      <Typography className={buyButtonTypographyVariants({ variant })}>
        {isSelected ? "В корзине" : "Купить"}
      </Typography>
    </Button>
  )
}, "ItemSelectToCart")

const storeItemBgImage = getStaticImage("patterns/pattern_light.png")

const StoreItem = ({
  description, id, title, price, imageUrl, currency
}: StoreItem) => {
  return (
    <div className={storeItemVariant().base()}>
      <div className="z-[1] select-none absolute w-full h-full">
        <img
          src={storeItemBgImage}
          draggable={false}
          width={600}
          height={600}
          alt=""
        />
      </div>
      <a
        href={createLink("store", id)}
        className="flex relative z-[2] items-center justify-center rounded-lg"
      >
        <img
          src={imageUrl}
          draggable={false}
          width={64}
          height={64}
          alt=""
          className={storeItemVariant().avatarImg()}
        />
      </a>
      <div className={storeItemVariant().info()}>
        <a
          href={createLink("store", id)}
          target="_blank"
          className="w-full overflow-hidden"
        >
          <Typography className={storeItemVariant().title()}>
            {title}
          </Typography>
        </a>
        <Typography color="gray" className={storeItemVariant().summary()}>
          {description}
        </Typography>
      </div>
      <div className={storeItemVariant().footer()}>
        <div className={storeItemVariant().priceWrapper({ className: "bg-blue-600" })}>
          <ItemPrice currency={currency} price={price} />
        </div>
        <ItemSelectToCart id={id} />
      </div>
    </div>
  )
}

const itemsNotFoundImage = getStaticImage("minecraft/items/block_inspect.webp")

const ItemsNotFound = () => {
  return (
    <div className="flex flex-col gap-2 items-center h-full justify-center w-full">
      <img src={itemsNotFoundImage} width={64} height={64} alt="" />
      <Typography className="text-xl font-semibold">Доступных товаров нет</Typography>
    </div>
  )
}

const storeListVariant = tv({
  base: `grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 auto-rows-auto gap-2 lg:gap-4 w-full h-full`
})

const StoreItemSkeleton = () => {
  return (
    <div className={storeItemVariant().base()}>
      <Skeleton className={storeItemVariant().avatarImg()} />
      <div className={storeItemVariant().info()}>
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-5 w-full" />
      </div>
      <div className={storeItemVariant().footer()}>
        <Skeleton className={storeItemVariant().priceWrapper({ className: "w-24" })} />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

const StoreListSkeleton = () => {
  return (
    <div className={storeListVariant()}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <StoreItemSkeleton key={idx} />
      ))}
    </div>
  )
}

export const StoreList = reatomComponent(({ ctx }) => {
  const data = ctx.spy(storeItemsDataAtom)

  if (ctx.spy(storeItemsIsPendingAtom)) {
    return <StoreListSkeleton />
  }

  if (!data?.length) return <ItemsNotFound />;

  return (
    <div className={storeListVariant()}>
      {data.map(item => <StoreItem key={item.id} {...item} />)}
    </div>
  )
}, "StoreList")
