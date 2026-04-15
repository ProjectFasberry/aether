import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Button } from "@repo/ui/button"
import { PageLoader } from "@/shared/ui/page-loader"
import { spawn } from "@reatom/framework"
import { authLogin, authLoginQRIsErrorAtom } from "@/shared/components/app/auth/models/auth.model"
import { IconX } from "@tabler/icons-react"

const ExpiredOrNotfound = () => {
  return (
    <p className="text-base text-center text-neutral-400 font-semibold">
      Токен устарел или не существует
    </p>
  )
}

const VerifyActions = reatomComponent(({ ctx }) => {
  const data = ctx.spy(authLogin.qr.validateToken.dataAtom)
  if (!data) return null;

  const isPending = ctx.spy(authLogin.qr.decline.statusesAtom).isPending
    || ctx.spy(authLogin.qr.confirm.statusesAtom).isPending

  return (
    <>
      <h1 className="text-xl text-neutral-50 font-semibold">
        Подтверждение входа
      </h1>
      <div className="flex text-lg text-neutral-400 w-3/6 text-center leading-5">
        <p>
          Новый запрос на вход с устройства&nbsp;
          <span className="font-semibold">{data.browser}</span> из <span className="font-semibold">{data.geo.city} {data.geo.country}</span>.
          Подтвердите, что это вы.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row mt-4 items-center gap-2 w-full sm:w-2/5 justify-center">
        <Button
          background="white"
          className="w-full"
          onClick={() => spawn(ctx, (spawnCtx) => authLogin.qr.confirm(spawnCtx))}
          disabled={isPending}
        >
          Это я
        </Button>
        <Button
          variant="danger"
          className="w-full"
          onClick={() => spawn(ctx, (spawnCtx) => authLogin.qr.decline(spawnCtx))}
          disabled={isPending}
        >
          Это не я
        </Button>
      </div>
    </>
  )
}, "VerifyActions")

const VerifyError = () => {
  return (
    <div className="flex flex-col gap-4 w-full items-center justify-center">
      <IconX className="text-red-500" size={22} />
      <ExpiredOrNotfound />
    </div>
  )
}

const Verify = reatomComponent(({ ctx }) => {
  if (ctx.spy(authLogin.qr.validateToken.statusesAtom).isPending) return <PageLoader />

  const data = ctx.spy(authLogin.qr.validateToken.dataAtom)
  if (!data) return <ExpiredOrNotfound />

  const isError = ctx.spy(authLoginQRIsErrorAtom)

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full">
      {isError ? <VerifyError /> : <VerifyActions />}
    </div>
  )
}, "Verify")

export default function Page() {
  useUpdate(authLogin.qr.validateToken, [])

  return (
    <div className="flex items-center w-full justify-center h-[90vh] overflow-hidden">
      <Verify />
    </div>
  )
}