import { Link } from "@/shared/components/config/link";
import { reatomComponent } from "@reatom/npm-react";
import { Typography } from "@repo/ui/typography";
import { IconX } from "@tabler/icons-react";
import { bannerIsExistsAtom, banner } from "../models/banner.model";
import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { BannerPayload } from "@repo/shared/types/entities/banner";
import { tv } from "tailwind-variants";

const BannerView = reatomComponent<{ id: number }>(({ ctx, id }) => {
  return (
    <Button
      disabled={ctx.spy(banner.fetch.statusesAtom).isPending}
      onClick={() => banner.createView(ctx, id)}
    >
      <IconX size={16} />
    </Button>
  )
}, "BannerView")

export const Banner = reatomComponent(({ ctx }) => {
  const isExist = ctx.spy(bannerIsExistsAtom);
  if (!isExist) return null;

  return (
    <div className="flex px-2 sm:px-6 items-center justify-center w-full h-[6vh] border-t border-neutral-800">
      <BannerInfo />
    </div>
  )
}, "Banner")

const bannerItemVariant = tv({
  slots: {
    base: 'relative w-full h-full flex items-center justify-center',
    wrapper: 'flex flex-col items-center gap-1',
    content: 'flex flex-col items-center min-w-0 gap-1 pointer-events-none',
    title: 'text-sm sm:text-lg truncate font-semibold leading-5 text-neutral-50',
    description: 'text-sm sm:text-base truncate text-neutral-300 leading-5',
    linkLabel: 'text-[12px] sm:text-sm underline leading-4 text-neutral-200',
    aside: 'absolute right-0 top-1/2 -translate-y-1/2'
  },
})

const BannerItem = ({ title, description, href, id }: BannerPayload) => {
  return (
    <div className={bannerItemVariant().base()}>
      <div className={bannerItemVariant().wrapper()}>
        <div className={bannerItemVariant().content()}>
          <Typography className={bannerItemVariant().title()}>{title}</Typography>
          {description && (
            <Typography className={bannerItemVariant().description()}>{description}</Typography>
          )}
        </div>
        <Link href={href.value} className={bannerItemVariant().linkLabel()}>
          {href.title}
        </Link>
      </div>
      <div className={bannerItemVariant().aside()}>
        <BannerView id={id} />
      </div>
    </div>
  )
}

export const BannerInfo = reatomComponent(({ ctx }) => {
  const data = ctx.spy(banner.fetch.dataAtom);

  if (ctx.spy(banner.fetch.statusesAtom).isPending) {
    return (
      <div className={bannerItemVariant().base()}>
        <div className={bannerItemVariant().wrapper()}>
          <div className={bannerItemVariant().content()}>
            <Skeleton className={bannerItemVariant().title({ className: "h-5 w-40" })} />
            <Skeleton className={bannerItemVariant().description({ className: "h-5 w-40" })} />
          </div>
          <Skeleton className={bannerItemVariant().linkLabel()} />
        </div>
        <Skeleton className={bannerItemVariant().aside({ className: "h-5 w-5" })} />
      </div>
    )
  }

  if (!data) return;

  return <BannerItem {...data} />
}, 'BannerInfo')