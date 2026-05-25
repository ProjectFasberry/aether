import { reatomComponent, useAtom } from "@reatom/npm-react"
import { Button } from "@/shared/ui/button"
import { Typography } from "@/shared/ui/typography"
import dayjs from "@/shared/lib/create-dayjs"
import { createPageModel } from "@/shared/lib/events"
import { logout } from "@/shared/components/app/auth/models/logout.model"
import { bannedAction } from "@/shared/components/app/auth/models/banned.model"

type Banned = {
  reason: string
  time: string
  created_at: string
}

const BannedActionButton = reatomComponent(({ ctx }) => {
  const isDisabled = ctx.spy(logout.exec.statusesAtom).isPending || ctx.spy(logout.exec.statusesAtom).isFulfilled;

  return (
    <Button
      onClick={() => logout.withConfirm(ctx)}
      disabled={isDisabled}
      className='bg-neutral-50 text-red font-semibold text-lg'
    >
      Выйти из аккаунта
    </Button>
  );
}, "BannedActionButton")

const Banned = reatomComponent(({ ctx }) => {
  const data = ctx.spy(bannedAction.dataAtom)
  if (!data) return null;

  const expires = data.expires ? dayjs(data.expires).format('DD.MM.YYYY HH:mm') : "никогда"

  return (
    <div className="flex flex-col gap-y-4 justify-center h-full items-center relative">
      <Typography
        color="gray"
        className="text-md font-semibold"
      >
        Соединение потеряно
      </Typography>
      <div className="flex flex-col items-center gap-y-4">
        <Typography
          className="text-xl font-semibold text-red"
        >
          Вы были заблокированы
        </Typography>
        <div className="flex flex-col items-center">
          <Typography
            className="text-lg font-semibold text-red"
          >
            Причина: <span className="text-neutral-50">{data?.reason ?? "не указана"}</span>
          </Typography>
          <Typography
            className="text-lg font-semibold text-red"
          >
            Разбан:{' '}
            <span className="text-neutral-50">
              {expires}
            </span>
          </Typography>
        </div>
        <div className="w-full *:w-full">
          <BannedActionButton />
        </div>
      </div>
    </div>
  )
})

const page = createPageModel({
  name: "banned",
  onConnAction: (ctx, dataAtom, pageCtx) => {
    bannedAction(ctx)
  },
})

export default function Page() {
  const [_] = useAtom(page.dataAtom)

  return (
    <div className="flex items-center h-[80vh] justify-center w-full">
      <Banned />
    </div>
  )
}