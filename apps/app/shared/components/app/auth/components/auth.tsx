import { reatomComponent } from "@reatom/npm-react";
import {
  acceptRulesAtom,
  globalErrorAtom,
  errorsTypeAtom,
  findoutAtom,
  nicknameAtom,
  passwordAtom,
  typeAtom,
  auth,
  passwordShowAtom,
  findoutTypeAtom,
  FINDOUT_OPTIONS,
  findoutSelectedTypeAtom,
  submitIsDisabledAtom,
  authLoginVariantAtom,
  AuthLoginVariant,
  authLogin,
  authLoginState,
} from "../models/auth.model";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input"
import { tv } from "tailwind-variants";
import { Typography } from "@repo/ui/typography";
import { CAP_INSTANCE_URL, CAP_SITEKEY, LANDING_URL } from "@/shared/env";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@repo/ui/select"
import { AtomState } from "@reatom/core";
import { ReactNode } from "react";
import { CapWidget } from "@better-captcha/react/provider/cap-widget";
import { pof } from "../models/pof.model";
import { IconEye, IconEyeOff, IconLoader2 } from "@tabler/icons-react";
import { Separator } from "@repo/ui/separator";
import { QRCodeSVG } from "qrcode.react";
import { spawn } from "@reatom/framework";
import { Copy } from "@/shared/ui/copy";

export const formVariant = tv({
  base: `rounded-lg border border-neutral-800 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-60`
})

const authInput = tv({
  base: `h-12 w-full data-[state=error]:border-red-500 data-[state=default]:border-neutral-800`
})

const NicknameInput = reatomComponent(({ ctx }) => {
  const state = ctx.spy(errorsTypeAtom).includes("nickname") ? "error" : "default"

  return (
    <Input
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      className={authInput()}
      variant="ghost"
      data-state={state}
      value={ctx.spy(nicknameAtom)}
      autoComplete="new-nickname"
      onClick={() => auth.resetError(ctx)}
      onChange={e => nicknameAtom(ctx, e.target.value)}
      placeholder="Никнейм"
      maxLength={32}
    />
  )
}, "Nickname")

const PasswordInput = reatomComponent(({ ctx }) => {
  const state = ctx.spy(errorsTypeAtom).includes("password") ? "error" : "default"

  const show = ctx.spy(passwordShowAtom)

  return (
    <div className="flex relative items-center justify-between w-full">
      <Input
        className={authInput()}
        data-state={state}
        value={ctx.spy(passwordAtom)}
        onClick={() => auth.resetError(ctx)}
        onChange={e => passwordAtom(ctx, e.target.value)}
        placeholder="Пароль"
        autoComplete="new-password"
        maxLength={64}
        variant="ghost"
        type={show ? "text" : "password"}
      />
      <div
        className="absolute bg-neutral-800 rounded-lg p-1 flex items-center justify-center cursor-pointer right-0 top-1/2 text-neutral-400 -translate-1/2"
        onClick={() => passwordShowAtom(ctx, (state) => !state)}
      >
        {show ? <IconEye size={18} /> : <IconEyeOff size={18} />}
      </div>
    </div>
  )
}, "Password")

const FindoutReferrerInput = reatomComponent(({ ctx }) => {
  const state = ctx.spy(errorsTypeAtom).includes("findout") ? "error" : "default"

  return (
    <Input
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      variant="ghost"
      autoComplete="new-referrer"
      placeholder="Никнейм"
      data-state={state}
      className={authInput()}
      value={ctx.spy(findoutAtom) ?? ""}
      onClick={() => auth.resetError(ctx)}
      onChange={e => findoutAtom(ctx, e.target.value)}
      maxLength={32}
    />
  )
}, "Referrer")

const FindoutOtherInput = reatomComponent(({ ctx }) => {
  const state = ctx.spy(errorsTypeAtom).includes("findout") ? "error" : "default"

  return (
    <Input
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      autoComplete="new-other"
      placeholder="Например: Telegram-канал"
      variant="ghost"
      className={authInput()}
      data-state={state}
      value={ctx.spy(findoutAtom) ?? ""}
      onClick={() => auth.resetError(ctx)}
      onChange={e => findoutAtom(ctx, e.target.value)}
      maxLength={128}
    />
  )
}, "Findout")

const FINDOUT_COMPONENTS: Record<NonNullable<AtomState<typeof findoutTypeAtom>>, ReactNode> = {
  "referrer": <FindoutReferrerInput />,
  "custom": <FindoutOtherInput />
}

const FindoutOptions = reatomComponent(({ ctx }) => {
  const currentItem = ctx.spy(findoutSelectedTypeAtom)

  return (
    <Select
      defaultValue={currentItem?.value}
      onValueChange={v => findoutTypeAtom(ctx, v as AtomState<typeof findoutTypeAtom>)}
    >
      <SelectTrigger className="min-h-12">
        {currentItem ? (
          <span className="text-neutral-50">{currentItem.title}</span>
        ) : (
          <SelectValue placeholder="Откуда узнали о проекте?" />
        )}
      </SelectTrigger>
      <SelectContent>
        {FINDOUT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}, "FindoutOptions")

const FindoutComponent = reatomComponent(({ ctx }) => {
  const currentValue = ctx.spy(findoutTypeAtom)
  return currentValue ? FINDOUT_COMPONENTS[currentValue] : null
}, "FindoutComponent")

export const AuthSubmit = reatomComponent(({ ctx }) => {
  const isDisabled = ctx.spy(submitIsDisabledAtom)

  return (
    <Button
      className="w-full bg-green-600"
      disabled={isDisabled}
      type="submit"
    >
      {ctx.spy(typeAtom) === 'register' ? "Зарегистрироваться" : "Войти"}
    </Button>
  )
}, "AuthSubmit")

const checkbox = tv({
  base: `peer h-5 w-5 duration-150 appearance-none
    rounded-lg shadow hover:shadow-md border-[2px] 
      border-neutral-800 bg-neutral-700 checked:bg-green-600 checked:border-green-700`
})

const PrivacyTerms = reatomComponent(({ ctx }) => {
  return (
    <div className="inline-flex gap-2 items-start">
      <label htmlFor="rules" className="flex items-center relative">
        <input
          id="rules"
          checked={ctx.spy(acceptRulesAtom)}
          type="checkbox"
          className={checkbox()}
          onChange={e => acceptRulesAtom(ctx, e.target.checked)}
        />
        <span
          className="absolute text-white opacity-0 peer-checked:opacity-100
               top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            ></path>
          </svg>
        </span>
      </label>
      <label className="select-none relative -top-1" htmlFor="rules">
        <Typography className="text-sm">
          Я согласен(-на) с положениями
          <a href="/legal/terms" target="_blank" className="inline text-green-500">
            &nbsp;пользовательского соглашения
          </a>,
          <a href="/legal/privacy" target="_blank" className=" inline text-green-500">
            &nbsp;политикой конфиденциальности&nbsp;
          </a>
          и
          <a href={`${LANDING_URL}/rules`} target="_blank" className="inline text-green-500">
            &nbsp;правилами проекта
          </a>.
        </Typography>
      </label>
    </div>
  )
}, "PrivacyTerms")

export const AuthError = reatomComponent(({ ctx }) => {
  const error = ctx.spy(globalErrorAtom)
  if (!error) return null;

  return <Typography className='font-semibold text-red-500'>{error}</Typography>
}, "AuthError")

export const RegisterForm = () => {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-2 w-full">
        <NicknameInput />
        <PasswordInput />
        <div className="flex flex-col gap-2 w-full">
          <FindoutOptions />
          <FindoutComponent />
        </div>
      </div>
      <PrivacyTerms />
      <AuthSubmit />
    </div>
  )
}

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

const LoginPassword = () => {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-2 w-full">
        <NicknameInput />
        <PasswordInput />
      </div>
      <AuthSubmit />
    </div>
  )
}

const LoginQR = reatomComponent(({ ctx }) => {
  const isPending = ctx.spy(authLogin.qr.generate.statusesAtom).isPending
  const url = ctx.spy(authLoginState.qr.url)

  const isLoading = isPending || !url

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex bg-neutral-700 items-center justify-center w-46 h-46 rounded-xl">
        {isLoading ? (
          <IconLoader2 className="animate-spin text-neutral-50 duration-200" />
        ) : (
          <QRCodeSVG value={url} className='w-46 h-46' />
        )}
      </div>
      <div className="flex flex-col items-start gap-2 w-fit">
        <p>1. Открой Fasberry на телефоне</p>
        <p>2. Зайди в Настройки {">"} Безопасность {">"} Привязать устройство</p>
        <p>3. Наведи телефон на QR-код на экране</p>
      </div>
    </div>
  )
}, "LoginQR")

const LoginGame = reatomComponent(({ ctx }) => {
  const code = ctx.spy(authLoginState.game.code)
  const isLoading = ctx.spy(authLogin.game.generate.statusesAtom).isPending || !code

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="w-full text-base">
        <p>
          Введи код в <span className="font-semibold">игре</span> с помощью команды ниже!&nbsp;
        </p>
        <p className="font-semibold">Никому не сообщай его!</p>
      </div>
      {isLoading ? (
        <IconLoader2 className="animate-spin text-neutral-500 duration-200" />
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

const LoginFormComponent = reatomComponent(({ ctx }) =>
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

export const Verify = reatomComponent(({ ctx }) => {
  const isVisible = ctx.spy(pof.showTokenVerifySectionAtom)
  if (!isVisible) return null;

  return (
    <CapWidget
      endpoint={`${CAP_INSTANCE_URL}/${CAP_SITEKEY}/`}
      options={{
        i18nInitialState: "Я человек",
        i18nVerifyingLabel: "Проверка...",
        i18nVerifyingAriaLabel: "Проверка...",
        i18nVerifiedAriaLabel: "Пройдено",
        i18nVerifyAriaLabel: "Пройти",
        i18nErrorAriaLabel: "Ошибка",
        i18nErrorLabel: "Ошибка",
        i18nWasmDisabled: "У вас отключен WASM",
        i18nSolvedLabel: "Пройдено",
      }}
      onSolve={(value) => auth.solve(ctx, value)}
      onError={(e) => globalErrorAtom(ctx, e instanceof Error ? e.message : e)}
    />
  )
}, "Verify")