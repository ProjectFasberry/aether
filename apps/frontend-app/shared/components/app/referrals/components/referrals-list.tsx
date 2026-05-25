import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { referrals } from "../models/referrals.model";
import { Noop } from "@/shared/ui/noop";
import { Avatar } from "@/shared/ui/avatar";
import { createLink, Link } from "@/shared/components/config/link";
import { PageLoader } from "@/shared/ui/page-loader";
import { Typography } from "@/shared/ui/typography";

export const ReferralsList = reatomComponent(({ ctx }) => {
  useUpdate(referrals.fetch, [])

  if (ctx.spy(referrals.fetch.statusesAtom).isPending) return <PageLoader />

  const data = ctx.spy(referrals.fetch.dataAtom)
  if (!data) return <Noop title="пусто" />

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
