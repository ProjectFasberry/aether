import { Avatar } from "@/shared/ui/avatar"
import { pageState } from "@/shared/models/page-context.model"
import { reatomComponent, useAtom } from "@reatom/npm-react"
import { Typography } from "@/shared/ui/typography"
import dayjs from "@/shared/lib/create-dayjs"
import { createPageModel } from "@/shared/lib/events"
import { users } from "@/shared/components/app/private/models/users.model"
import { PageLoader } from "@/shared/ui/page-loader"
import { BackButton } from "@/shared/ui/back-button"
import { ClientOnly } from "vike-react/ClientOnly"
import { lazy } from "react"

const ReactSkinview3d = lazy(() => import("react-skinview3d").then((m) => ({ default: m.ReactSkinview3d })));

const UserInfo = reatomComponent(({ ctx }) => {
  if (ctx.spy(users.fetchSingle.statusesAtom).isPending) return <PageLoader />

  const data = ctx.spy(users.fetchSingle.dataAtom);
  if (!data) return null;

  return (
    <div className="flex sm:flex-row flex-col w-full gap-4 items-start">
      <div className="flex flex-col items-start w-full sm:w-[100%-300px] h-full">
        <Avatar url={data.avatar} nickname={data.nickname} className="h-20 w-20 mb-4" />
        <Typography>
          ID: {data.player?.id ?? "Unregistered"}
        </Typography>
        <Typography>
          Никнейм: {data.nickname} ({data.lower_case_nickname})
        </Typography>
        Регистрация: {dayjs(data.created_at).format("DD.MM.YYYY hh:mm")}
        <Typography>
          UUID: {data.uuid}
        </Typography>
        <Typography>
          Premium UUID: {data.premium_uuid ?? "none"}
        </Typography>
        <Typography>
          Роль: {data.role ? `${data.role.name} ${data.role.id}` : `none`}
        </Typography>
      </div>
      <div className="flex w-full bg-neutral-900 h-[390px] rounded-lg p-2 sm:w-[300px]">
        {data.skin?.[0].skin_url ? (
          <ClientOnly>
            <ReactSkinview3d
              skinUrl={data.skin[0].skin_url}
              height="390"
              width="300"
              options={{ zoom: 0.8 }}
            />
          </ClientOnly>
        ) : (
          <span className="m-auto text-neutral-400">Скина нет</span>
        )}
      </div>
    </div>
  )
}, "UserInfo")

const page = createPageModel({
  name: "users",
  onSpyAction: (ctx, dataAtom, routeParams) => {
    users.fetchSingle(ctx, routeParams?.nickname ?? "")
  },
  spyedAtom: pageState.routeParams
})

export default function Page() {
  const [_] = useAtom(page.dataAtom)

  return (
    <div className="flex flex-col w-full gap-4 justify-center h-full">
      <BackButton />
      <UserInfo />
    </div>
  )
}