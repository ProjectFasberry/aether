import { Avatar } from "@/shared/components/app/avatar/components/avatar"
import { referrals } from "@/shared/components/app/referrals/models/referrals.model"
import { createLink, Link } from "@/shared/components/config/link"
import { LANDING_URL } from "@/shared/env"
import { getStaticImage } from "@/shared/lib/volume-helpers"
import { currentUserState } from "@/shared/models/current-user.model"
import { PageHeaderImage } from "@/shared/ui/header-image"
import { PageLoader } from "@/shared/ui/page-loader"
import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Button } from "@repo/ui/button"
import { Typography } from "@repo/ui/typography"
import { IconBook, IconPlus } from "@tabler/icons-react"
import { toast } from "sonner"

const ReferralsLink = reatomComponent(({ ctx }) => {
  const handle = async () => {
    const nickname = ctx.get(currentUserState)?.nickname;
    if (!nickname) return null;

    const link = referrals.getReferralIp(nickname)
    await navigator.clipboard.writeText(link)
    toast.success("Ссылка скопирована");
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 justify-start w-full">
      <Button
        background="white"
        className="gap-2 sm:w-fit w-full font-semibold truncate"
        onClick={handle}
      >
        <IconPlus size={20} />
        Пригласить игрока
      </Button>
      <a
        href={`${LANDING_URL}/wiki/referals`}
        target="_blank"
        className="flex min-w-0 sm:w-fit w-full"
      >
        <Button
          background="default"
          className="gap-2 flex-1 min-w-0 truncate w-full font-semibold"
        >
          <IconBook size={20} />
          Как работает реферальная система
        </Button>
      </a>
    </div>
  )
}, "ReferralsLink")

const ReferralsList = reatomComponent(({ ctx }) => {
  useUpdate(referrals.fetch, [])

  if (ctx.spy(referrals.fetch.statusesAtom).isPending) return <PageLoader />

  const data = ctx.spy(referrals.fetch.dataAtom)
  if (!data) return <span>пусто</span>

  return (
    <div className="flex flex-wrap gap-4 w-full h-fit">
      {data.map(({ referral, completed, id }) => (
        <div
          key={id}
          className="flex flex-col flex-1 min-w-0 p-4 h-22 gap-2 border border-neutral-800 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Link href={createLink("player", referral.nickname)}>
              <Avatar
                nickname={referral.nickname}
                url={referral.avatar}
                className="h-6 w-6"
              />
            </Link>
            <Link href={createLink("player", referral.nickname)}>
              <Typography>
                {referral.nickname}
              </Typography>
            </Link>
          </div>
          <div className="flex items-center gap-1 min-w-0">
            <Typography>
              Статус:
            </Typography>
            <Typography
              data-state={completed}
              className="data-[state=true]:text-green-500 truncate data-[state=false]:text-neutral-400"
            >
              {completed ? "завершен" : "в процессе"}
            </Typography>
          </div>
        </div>
      ))}
    </div>
  )
}, "ReferralsList")

const referalsImage = getStaticImage("images/emotes-preview.webp")

export default function Page() {
  return (
    <div className="flex flex-col gap-6 w-full min-w-0 h-full">
      <PageHeaderImage img={referalsImage} />
      <div className="flex flex-col gap-4 min-w-0 w-full h-full">
        <Typography className="text-3xl font-semibold">
          Ваши рефералы
        </Typography>
        <ReferralsLink />
        <ReferralsList />
      </div>
    </div>
  )
}