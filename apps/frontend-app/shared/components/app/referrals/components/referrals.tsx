import { currentUserState } from "@/shared/models/current-user/index.model";
import { reatomComponent } from "@reatom/npm-react";
import { referrals } from "../models/referrals.model";
import { Button } from "@/shared/ui/button";
import { IconBook, IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import { env } from "@/shared/env";

export const ReferralsLink = reatomComponent(({ ctx }) => {
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
        href={`${env.VITE_LANDING_URL}/wiki/referals`}
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
