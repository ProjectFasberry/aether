import { createLink, Link } from "@/shared/components/config/link"
import { getStaticImage } from "@/shared/lib/volume-helpers"
import { Typography } from "@/shared/ui/typography"
import { getItemStatus, type StoreItem as StoreItemProps, storeItem } from "../../models/store-item.model"
import { Skeleton } from "@/shared/ui/skeleton"
import { pageState } from "@/shared/models/page-context.model"
import { reatomComponent } from "@reatom/npm-react"
import { tv } from "tailwind-variants"
import { Button } from "@/shared/ui/button"
import { translate } from "@/shared/locales/helpers"
import { CURRENCIES } from "@/shared/consts/store"

const buyButtonVariants = tv({
  base: `group gap-2 duration-150 h-10 *:duration-150 px-6 w-full rounded-xl`,
  variants: {
    variant: {
      default: "bg-neutral-700",
      active: "bg-neutral-50 hover:bg-neutral-200",
      inactive: "bg-green-500/80"
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

const storeItemVariant = tv({
  base: `flex flex-col items-center w-full overflow-hidden rounded-xl justify-between gap-2 p-2 sm:p-4 relative`,
  variants: {
    variant: {
      default: "bg-gradient-to-b from-neutral-800/80 via-neutral-800/70 to-neutral-800/60"
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

export const ItemSelectToCart = reatomComponent<Pick<StoreItemProps, "id">>(({ ctx, id }) => {
  if (!ctx.spy(pageState.isClientside)) {
    return <Skeleton className={buyButtonVariants({ variant: "default" })} />
  }

  const state = ctx.spy(getItemStatus(id))

  const isLoading = state?.isLoading ?? false
  const isSelected = state?.isSelected ?? false;

  const variant: "active" | "inactive" = isSelected ? "active" : "inactive"

  return (
    <Button
      className={buyButtonVariants({ variant })}
      disabled={isLoading}
      onClick={() => storeItem.add(ctx, id)}
      withSpinner={true}
      isLoading={isLoading}
    >
      <Typography className={buyButtonTypographyVariants({ variant })}>
        {isSelected ? translate["store.inCart"]() : translate["store.buy"]()}
      </Typography>
    </Button>
  )
}, "ItemSelectToCart")

const storeItemBgImage = getStaticImage("patterns/pattern_light.png")

export const StoreItem = ({
  description, id, title, price, imageUrl, currency
}: StoreItemProps) => {
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
      <Link
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
      </Link>
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
