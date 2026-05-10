import { pageState } from "@/shared/models/page-context.model"
import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Separator } from "@repo/ui/separator"
import { Skeleton } from "@repo/ui/skeleton"
import { playerSocials, PlayerSocialsPayload, PlayerSocialsValuePayload, SOCIAL_EVENTS, SOCIAL_ICONS } from "../models/socials.model"

const SocialCard = ({ type, value }: { type: PlayerSocialsPayload["type"], value: PlayerSocialsValuePayload }) => {
  const icon = SOCIAL_ICONS[type]()
  const { cb, type: cbType } = SOCIAL_EVENTS[type];

  return (
    cbType === 'link' ? (
      <a href={cb(value)} className="flex items-center cursor-pointer gap-2">
        {icon}
        <span className="hidden sm:inline text-lg">{value.username}</span>
      </a>
    ) : (
      <div className="flex items-center cursor-pointer gap-2" onClick={() => cb(value)}>
        {icon}
        <span className="hidden sm:inline text-lg">{value.username}</span>
      </div>
    )
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
  useUpdate((ctx) => playerSocials.init(ctx), []);
  
  if (!ctx.spy(pageState.isClientside) || ctx.spy(playerSocials.fetch.statusesAtom).isPending) {
    return <PlayerSocialsSkeleton/>
  }

  const data = ctx.spy(playerSocials.fetch.dataAtom);
  if (!data) return null;

  return (
    <div className="flex flex-col w-full gap-4">
      <Separator className="hidden sm:block" />
      {data.map((item) => <SocialCard key={item.type} type={item.type} value={item.value} />)}
      <Separator className="hidden sm:block" />
    </div>
  )
}, "PlayerSocials")