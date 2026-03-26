import { reatomComponent } from "@reatom/npm-react";
import {
  acceptRulesAtom,
  authorizeAction,
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
import { IconEye, IconEyeOff } from "@tabler/icons-react";

export const formVariant = tv({
  base: `rounded-lg border border-neutral-800 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-60`
})

const authInput = tv({
  base: `p-2 h-12 text-lg w-full placeholder:text-neutral-400 
    bg-transparent border data-[state=error]:border-red-500 data-[state=default]:border-neutral-800`
})

const NicknameInput = reatomComponent(({ ctx }) => {
  const state = ctx.spy(errorsTypeAtom).includes("nickname") ? "error" : "default"

  return (
    <Input
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      className={authInput()}
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
        type={show ? "text" : "password"}
      />
      <div
        className="absolute cursor-pointer right-0 top-1/2 text-neutral-400 -translate-1/2"
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
      <SelectTrigger className={authInput({ className: "min-h-12 border-neutral-800" })}>
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
      background="default"
      className="w-full"
      onClick={() => authorizeAction(ctx)}
      disabled={isDisabled}
    >
      <Typography className="font-semibold  text-lg">
        {ctx.spy(typeAtom) === 'register' ? "Зарегистрироваться" : "Войти"}
      </Typography>
    </Button>
  )
}, "AuthSubmit")

const checkbox = tv({
  base: `peer h-5 w-5 lg:h-6 lg:w-6 cursor-pointer transition-all appearance-none
    rounded-lg shadow hover:shadow-md border-[2px] 
      border-neutral-600 bg-neutral-700 checked:bg-neutral-900 checked:border-black`
})

const PrivacyTerms = reatomComponent(({ ctx }) => {
  return (
    <div className="inline-flex gap-2 items-start">
      <label htmlFor="rules" className="flex items-center cursor-pointer relative">
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
      <label className="select-none cursor-pointer relative -top-1" htmlFor="rules">
        <Typography className="text-base sm:text-lg">
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
      <NicknameInput />
      <PasswordInput />
      <div className="flex flex-col gap-2 w-full">
        <FindoutOptions />
        <FindoutComponent />
      </div>
      <PrivacyTerms />
    </div>
  )
}

export const LoginForm = () => {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <NicknameInput />
      <PasswordInput />
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