import { reatomComponent } from "@reatom/npm-react"
import { login, type AuthLoginQRStatus, loginState, type AuthLoginVariant, authLoginVariantAtom, authSubmitIsDisabledAtom } from "../models/login.model"
import { type ReactNode, useRef } from "react"
import { IconCheck, IconHandStop, IconRefresh } from "@tabler/icons-react"
// import { Copy } from "@/shared/ui/copy"
import { Button } from "@/shared/ui/button"
import { spawn } from "@reatom/framework"
import { Separator } from "@/shared/ui/separator"
import { NicknameInput, PasswordInput } from "./auth"
import { IconLoader } from "@/shared/ui/icon-loader"
import { translate } from "@/shared/locales/helpers"
import { QrCode } from "@ark-ui/react/qr-code"
import { qrCodeFrameVariant, qrCodeOverlayVariant, qrCodePatternVariant, qrCodeRootVariant } from "@/shared/ui/qr-code"

const LoginVariants = reatomComponent(({ ctx }) => (
  <div className="grid grid-cols-2 auto-rows-auto gap-2 w-full [&>*:only-child]:col-span-2">
    {ctx.spy(authLoginVariantAtom.filterVariants(LOGIN_VARIANTS)).map((variant) => (
      <Button
        key={variant.value}
        type="button"
        background="default"
        onClick={() => spawn(ctx, (spawnCtx) => authLoginVariantAtom.select(spawnCtx, variant.value))}
      >
        {variant.title}
      </Button>
    ))}
  </div>
), "LoginVariants")

const LoginPasswordSubmit = reatomComponent(({ ctx }) => (
  <Button
    className="w-full bg-green-600 h-10 font-semibold"
    disabled={ctx.spy(authSubmitIsDisabledAtom)}
    type="submit"
  >
    {translate["auth.login.submit"]()}
  </Button>
), "LoginPasswordSubmit")

const LoginPassword = reatomComponent(({ ctx }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    spawn(ctx, (spawnCtx) => login.basic.submit(spawnCtx))
  }

  return (
    <form
      className="flex flex-col gap-4 w-full h-full"
      onSubmit={handleSubmit}
      autoComplete="off"
    >
      <div className="flex flex-col gap-2 w-full">
        <NicknameInput />
        <PasswordInput />
      </div>
      <LoginPasswordSubmit />
    </form>
  )
}, 'LoginPassword')

const LoginQRRetry = reatomComponent(({ ctx }) => {
  const iconRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    const el = iconRef.current;
    if (!el) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    el.classList.remove('animate-spin', 'duration-150');
    void el.offsetWidth;
    el.classList.add('animate-spin', 'duration-150');

    timeoutRef.current = setTimeout(() => {
      el.classList.remove('animate-spin', 'duration-150');
    }, 600);

    spawn(ctx, (spawnCtx) => login.qr.generate(spawnCtx));
  };

  return (
    <div className="flex flex-col w-full items-center justify-center">
      <button
        type="button"
        disabled={ctx.spy(login.qr.generate.statusesAtom).isPending}
        onClick={handleClick}
        className="group cursor-pointer active:scale-[0.98] duration-150"
      >
        <div ref={iconRef}>
          <IconRefresh size={42} className="text-neutral-200" />
        </div>
      </button>
    </div>
  )
}, "LoginQRRetry")

const LoginQRConnected = reatomComponent(({ ctx }) => {
  const isPending = ctx.spy(login.qr.generate.statusesAtom).isPending
  const url = ctx.spy(loginState.qr.url)
  if (isPending || !url) return <IconLoader />

  return (
    <QrCode.Root
      defaultValue={url}
      encoding={{ ecc: 'M' }}
      className={qrCodeRootVariant({ className: "[--qr-code-size:196px]" })}
    >
      <QrCode.Frame className={qrCodeFrameVariant()}>
        <QrCode.Pattern className={qrCodePatternVariant()} />
      </QrCode.Frame>
      <QrCode.Overlay className={qrCodeOverlayVariant()}>
        <img src="/favicon.ico" alt="" draggable={false} />
      </QrCode.Overlay>
    </QrCode.Root>
  )
}, "LoginQRConnected")

const LoginQRDeclined = () => (
  <div className="flex flex-col w-full items-center justify-center gap-4">
    <IconHandStop size={32} className="text-red-600" />
  </div>
)
const LoginVerified = () => (
  <div className="flex flex-col w-full items-center justify-center gap-4">
    <IconCheck size={32} className="text-green-600" />
  </div>
)

const LOGIN_QR_COMPONENTS: Partial<Record<AuthLoginQRStatus, ReactNode>> = {
  "expired": <LoginQRRetry />,
  "connected": <LoginQRConnected />,
  "declined": <LoginQRDeclined />,
  "verified": <LoginVerified />
}

const LoginQRContent = reatomComponent(({ ctx }) =>
  LOGIN_QR_COMPONENTS[ctx.spy(loginState.qr.status)], "LoginQRContent"
)

const LoginQR = () => {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex items-center justify-center w-46 h-46 rounded-xl">
        <LoginQRContent />
      </div>
      <div className="flex flex-col items-start gap-2 w-fit">
        <p>{translate["auth.login.qr.steps.1"]()}</p>
        <p>{translate["auth.login.qr.steps.2"]()}</p>
        <p>{translate["auth.login.qr.steps.3"]()}</p>
      </div>
    </div>
  )
}

// const LoginGame = reatomComponent(({ ctx }) => {
//   const code = ctx.spy(loginState.game.code)
//   const isPending = ctx.spy(login.game.generate.statusesAtom).isPending
//   const isLoading = isPending || !code

//   return (
//     <div className="flex flex-col items-center gap-4 w-full">
//       <div className="w-full text-base">
//         <p>
//           Введи код в <span className="font-semibold">игре</span> с помощью команды ниже!&nbsp;
//         </p>
//         <p className="font-semibold">Никому не сообщай его!</p>
//       </div>
//       {isLoading ? <IconLoader /> : <Copy code={`/verify ${code}`} />}
//     </div>
//   )
// }, "LoginGame")

const LOGIN_VARIANTS: { title: string, value: AuthLoginVariant, component: ReactNode }[] = [
  { title: translate["auth.login.variants.basic"](), value: "password", component: <LoginPassword /> },
  // { title: "Через игру", value: "game", component: <LoginGame /> },
  { title: translate["auth.login.variants.qr"](), value: "qr", component: <LoginQR /> }
]

const LoginFormComponent = reatomComponent(({ ctx }) =>
  LOGIN_VARIANTS.find(d => d.value === ctx.spy(authLoginVariantAtom))?.component, "LoginFormComponent"
)

export const LoginForm = () => {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <LoginFormComponent />
      <div className="flex flex-col w-full gap-2 items-center justify-center">
        <div className="flex items-center w-full gap-4">
          <Separator className="flex-1" />
          <span className="shrink-0 text-sm text-neutral-50">
            {translate["auth.login.otherVariantsTitle"]()}
          </span>
          <Separator className="flex-1" />
        </div>
        <LoginVariants />
      </div>
    </div>
  )
}
