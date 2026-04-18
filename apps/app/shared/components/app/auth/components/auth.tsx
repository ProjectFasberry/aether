import { reatomComponent } from "@reatom/npm-react";
import { auth, authState } from "../models/auth.model";
import { Input } from "@repo/ui/input"
import { tv } from "tailwind-variants";
import { Typography } from "@repo/ui/typography";
import { CAP_INSTANCE_URL, CAP_SITEKEY } from "@/shared/env";
import { CapWidget } from "@better-captcha/react/provider/cap-widget";
import { pof } from "../models/pof.model";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

export const authInput = tv({
  base: `h-12 w-full`,
  variants: {
    variant: {
      default: "border-neutral-800",
      danger: "border-red-500"
    }
  },
  defaultVariants: {
    variant: "default"
  }
})

export const buttonVariant = tv({
  base: `w-full bg-green-600 font-semibold`
})

export const NicknameInput = reatomComponent(({ ctx }) => {
  const variant = ctx.spy(authState.errorsType).includes("nickname") ? "danger" : "default"
  const value = ctx.spy(authState.fields.nickname);

  return (
    <Input
      id="nickname"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      className={authInput({ variant })}
      variant="ghost"
      value={value}
      autoComplete="nickname"
      onClick={() => auth.resetError(ctx)}
      onChange={e => authState.fields.nickname(ctx, e.target.value)}
      placeholder="Никнейм"
      maxLength={32}
      type="text"
    />
  )
}, "Nickname")

const PasswordVisibility = reatomComponent(({ ctx }) => {
  const show = ctx.spy(authState.settings.showPassword)

  return (
    <div
      className="flex *:m-auto text-neutral-400 bg-neutral-800 rounded-lg absolute p-1 right-0 top-1/2 -translate-1/2"
      onClick={() => authState.settings.showPassword(ctx, (state) => !state)}
    >
      {show ? <IconEye size={18} /> : <IconEyeOff size={18} />}
    </div>
  )
}, "PasswordVisibility")

export const PasswordInput = reatomComponent(({ ctx }) => {
  const variant = ctx.spy(authState.errorsType).includes("password") ? "danger" : "default"
  const show = ctx.spy(authState.settings.showPassword)
  const value = ctx.spy(authState.fields.password);

  return (
    <div className="flex relative items-center justify-between w-full">
      <Input
        id="passw"
        variant="ghost"
        className={authInput({ variant })}
        value={value}
        autoComplete="password"
        onClick={() => auth.resetError(ctx)}
        onChange={e => authState.fields.password(ctx, e.target.value)}
        placeholder="Пароль"
        maxLength={64}
        type={show ? "text" : "password"}
      />
      <PasswordVisibility />
    </div>
  )
}, "Password")

export const AuthError = reatomComponent(({ ctx }) => {
  const error = ctx.spy(authState.globalError)
  if (!error) return null;

  return (
    <div id="error" className="flex bg-red-700/60 max-w-2xl rounded-lg px-4 py-2 items-center justify-start">
      <Typography className='text-base font-semibold'>
        {error}
      </Typography>
    </div>
  )
}, "AuthError")

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
      onError={(e) => authState.globalError(ctx, e instanceof Error ? e.message : e)}
    />
  )
}, "Verify")