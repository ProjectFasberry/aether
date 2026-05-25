import { reatomComponent } from "@reatom/npm-react";
import { auth, authState } from "../models/auth.model";
import { Input } from "@/shared/ui/input"
import { env } from "@/shared/env";
import { CapWidget } from "@better-captcha/react/provider/cap-widget";
import { pof } from "../../../../models/shared.model";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { ErrorBlock } from "@/shared/ui/error-block";
import { translate } from "@/shared/locales/helpers";

export const NicknameInput = reatomComponent(({ ctx }) => (
  <Input
    id="nickname"
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck="false"
    className="w-full"
    variant={ctx.spy(authState.errorsType).includes("nickname") ? "danger" : "default"}
    value={ctx.spy(authState.fields.nickname)}
    autoComplete="nickname"
    onClick={() => auth.resetError(ctx)}
    onChange={e => authState.fields.nickname(ctx, e.target.value)}
    placeholder={translate["auth.shared.placeholders.nickname"]()}
    maxLength={32}
  />
), "Nickname")

const PasswordVisibility = reatomComponent(({ ctx }) => (
  <div
    className="flex *:m-auto hover:text-neutral-50 duration-150 ease text-neutral-400 absolute p-1 right-0 top-1/2 -translate-1/2"
    onClick={() => authState.settings.showPassword(ctx, (state) => !state)}
  >
    {ctx.spy(authState.settings.showPassword) ? <IconEye size={18} /> : <IconEyeOff size={18} />}
  </div>
), "PasswordVisibility")

export const PasswordInput = reatomComponent(({ ctx }) => (
  <div className="flex relative items-center justify-between w-full">
    <Input
      id="password"
      className="w-full"
      variant={ctx.spy(authState.errorsType).includes("password") ? "danger" : "default"}
      value={ctx.spy(authState.fields.password)}
      autoComplete="password"
      onClick={() => auth.resetError(ctx)}
      onChange={e => authState.fields.password(ctx, e.target.value)}
      placeholder={translate["auth.shared.placeholders.password"]()}
      maxLength={64}
      type={ctx.spy(authState.settings.showPassword) ? "text" : "password"}
    />
    <PasswordVisibility />
  </div>
), "Password")

export const AuthError = reatomComponent(({ ctx }) => {
  const error = ctx.spy(authState.globalError)
  if (!error) return null;
  return <ErrorBlock title={error} />
}, "AuthError")

const getCapUrl = () => `${env.VITE_CAP_URL}/${env.VITE_CAP_SITE_KEY}/`;

const CAP_OPTIONS = {
  i18nInitialState: "Я человек",
  i18nVerifyingLabel: "Проверка...",
  i18nVerifyingAriaLabel: "Проверка...",
  i18nVerifiedAriaLabel: "Пройдено",
  i18nVerifyAriaLabel: "Пройти",
  i18nErrorAriaLabel: "Ошибка",
  i18nErrorLabel: "Ошибка",
  i18nWasmDisabled: "У вас отключен WASM",
  i18nSolvedLabel: "Пройдено",
}

// TODO: make CapWidget global
export const Verify = reatomComponent(({ ctx }) => {
  if (!ctx.spy(pof.showTokenVerifySectionAtom)) return null;

  return (
    <CapWidget
      endpoint={getCapUrl()}
      options={CAP_OPTIONS}
      onSolve={(value) => auth.solve(ctx, value)}
      onError={(e) => authState.globalError(ctx, e instanceof Error ? e.message : e)}
    />
  )
}, "Verify")
