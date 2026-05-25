import { pageState } from "@/shared/models/page-context.model"
import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Separator } from "@/shared/ui/separator"
import { Skeleton } from "@/shared/ui/skeleton"
import { playerSocials, type PlayerSocialsItem, SOCIAL_EVENTS } from "../models/socials.model"
import { SOCIALS_ICONS } from "@/shared/consts/icons"
import { Icon } from "@/shared/ui/icon"
import { tv } from "tailwind-variants"

const socialCardVariant = tv({
  base: `flex items-center cursor-pointer gap-2`,
  slots: {
    icon: "size-5",
    label: "hidden sm:inline text-lg capitalize"
  }
})

const SocialCard = ({ social, value }: PlayerSocialsItem) => {
  const icon = SOCIALS_ICONS[social]
  const { cb, type } = SOCIAL_EVENTS[social];

  const renderContent = () => (
    <>
      <Icon name={icon} className={socialCardVariant().icon()} />
      <span className={socialCardVariant().label()}>{social}</span>
    </>
  )

  if (type === 'link') {
    return (
      <a href={cb(value)} className={socialCardVariant().base()}>
        {renderContent()}
      </a>
    )
  }

  return (
    <div className={socialCardVariant().base()} onClick={() => cb(value)}>
      {renderContent()}
    </div>
  )
}

const PlayerSocialsSkeleton = () => {
  return (
    <div className="flex flex-col w-full gap-4">
      <Separator />
      <div className="flex items-center gap-2">
        <Skeleton className="w-5 h-5 rounded-md" />
        <Skeleton className="w-32 h-5 rounded-md" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-5 h-5 rounded-md" />
        <Skeleton className="w-32 h-5 rounded-md" />
      </div>
      <Separator />
    </div>
  )
}

export const PlayerSocials = reatomComponent(({ ctx }) => {
  useUpdate(playerSocials.init, []);

  if (!ctx.spy(pageState.isClientside) || ctx.spy(playerSocials.fetch.statusesAtom).isPending) {
    return <PlayerSocialsSkeleton />
  }

  const data = ctx.spy(playerSocials.fetch.dataAtom);
  if (!data) return null;

  return (
    <div className="flex flex-col w-full gap-4">
      <Separator className="hidden sm:block" />
      {data.map((item) => <SocialCard key={item.social} {...item} />)}
      <Separator className="hidden sm:block" />
    </div>
  )
}, "PlayerSocials")
