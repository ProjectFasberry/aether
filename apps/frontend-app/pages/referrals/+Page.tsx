import { getStaticImage } from "@/shared/lib/volume-helpers"
import { PageHeaderImage } from "@/shared/ui/header-image"
import { Typography } from "@/shared/ui/typography"
import { ReferralsLink } from "@/shared/components/app/referrals/components/referrals"
import { ReferralsList } from "@/shared/components/app/referrals/components/referrals-list"

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
