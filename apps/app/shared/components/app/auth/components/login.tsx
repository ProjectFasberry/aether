import { reatomComponent } from "@reatom/npm-react"
import { login, AuthLoginQRStatus, loginState, AuthLoginVariant, authLoginVariantAtom, authSubmitIsDisabledAtom } from "../models/login.model"
import { ReactNode, useRef } from "react"
import { IconCheck, IconHandStop, IconRefresh } from "@tabler/icons-react"
import { Copy } from "@/shared/ui/copy"
import { Button } from "@repo/ui/button"
import { spawn } from "@reatom/framework"
import { Separator } from "@repo/ui/separator"
import { NicknameInput, PasswordInput } from "./auth"
import { QRCode } from 'react-qrcode-logo';
import { IconLoader } from "@/shared/ui/icon-loader"
import { authState } from "../models/auth.model"

const LoginVariants = reatomComponent(({ ctx }) => {
  const variants = ctx.spy(authLoginVariantAtom.filterVariants(LOGIN_VARIANTS))

  return (
    <div className="grid *:bg-neutral-700 grid-cols-2 auto-rows-auto gap-2 w-full">
      {variants.map((variant) => (
        <Button
          key={variant.value}
          type="button"
          onClick={() => spawn(ctx, (spawnCtx) => authLoginVariantAtom.select(spawnCtx, variant.value))}
        >
          {variant.title}
        </Button>
      ))}
    </div>
  )
}, "LoginVariants")

const LoginPasswordSubmit = reatomComponent(({ ctx }) => {
  const isDisabled = ctx.spy(authSubmitIsDisabledAtom)
  const text = ctx.spy(authState.type) === 'register' ? "Зарегистрироваться" : "Войти";

  return (
    <Button
      className="w-full bg-green-600 h-10 font-semibold"
      disabled={isDisabled}
      type="submit"
    >
      {text}
    </Button>
  )
}, "LoginPasswordSubmit")

const LoginPassword = reatomComponent(({ ctx }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    login.basic.submit(ctx)
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

  const isLoading = isPending || !url
  if (isLoading) return <IconLoader />

  return (
    <QRCode
      value={url}
      bgColor="#FFF"
      logoImage="/favicon.ico"
      logoWidth={36}
      ecLevel="M"
      logoHeight={36}
      qrStyle="squares"
      style={{
        borderRadius: "12px",
        width: 196,
        height: 196
      }}
      removeQrCodeBehindLogo={true}
      eyeRadius={22}
      logoPaddingStyle="circle"
    />
  )
}, "LoginQRConnected")

const LoginQRDeclined = () => {
  return (
    <div className="flex flex-col w-full items-center justify-center gap-4">
      <IconHandStop size={32} className="text-red-600" />
    </div>
  )
}

const LoginVerified = () => {
  return (
    <div className="flex flex-col w-full items-center justify-center gap-4">
      <IconCheck size={32} className="text-green-600" />
    </div>
  )
}

const LOGIN_QR_COMPONENTS: Partial<Record<AuthLoginQRStatus, ReactNode>> = {
  "expired": <LoginQRRetry />,
  "connected": <LoginQRConnected />,
  "declined": <LoginQRDeclined />,
  "verified": <LoginVerified />
}

const LoginQRContent = reatomComponent(({ ctx }) =>
  LOGIN_QR_COMPONENTS[ctx.spy(loginState.qr.status)],
  "LoginQRContent"
)

const LoginQR = () => {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex items-center justify-center w-46 h-46 rounded-xl">
        <LoginQRContent />
      </div>
      <div className="flex flex-col items-start gap-2 w-fit">
        <p>1. Открой Fasberry на телефоне</p>
        <p>2. Зайди в Настройки {">"} Безопасность {">"} Привязать устройство</p>
        <p>3. Наведи телефон на QR-код на экране</p>
      </div>
    </div>
  )
}

const LoginGame = reatomComponent(({ ctx }) => {
  const code = ctx.spy(loginState.game.code)
  const isPending = ctx.spy(login.game.generate.statusesAtom).isPending
  const isLoading = isPending || !code

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="w-full text-base">
        <p>
          Введи код в <span className="font-semibold">игре</span> с помощью команды ниже!&nbsp;
        </p>
        <p className="font-semibold">Никому не сообщай его!</p>
      </div>
      {isLoading ? (
        <IconLoader />
      ) : (
        <Copy code={`/verify ${code}`} />
      )}
    </div>
  )
}, "LoginGame")

const LOGIN_VARIANTS: { title: string, value: AuthLoginVariant, component: ReactNode }[] = [
  { title: "Через пароль", value: "password", component: <LoginPassword /> },
  { title: "Через игру", value: "game", component: <LoginGame /> },
  { title: "Через QR-code", value: "qr", component: <LoginQR /> }
]

export const LoginFormComponent = reatomComponent(({ ctx }) =>
  LOGIN_VARIANTS.find(d => d.value === ctx.spy(authLoginVariantAtom))?.component,
  "LoginFormComponent"
)

export const LoginForm = () => {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <LoginFormComponent />
      <div className="flex flex-col w-full gap-2 items-center justify-center">
        <div className="flex items-center w-full gap-4">
          <Separator className="flex-1" />
          <span className="shrink-0 text-sm text-neutral-50">
            Другие способы входа
          </span>
          <Separator className="flex-1" />
        </div>
        <LoginVariants />
      </div>
    </div>
  )
}