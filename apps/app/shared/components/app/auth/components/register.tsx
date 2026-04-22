import { NicknameInput, PasswordInput } from "./auth"
import { reatomComponent } from "@reatom/npm-react"
import { auth, type AuthFindoutType, authState, FINDOUT_OPTIONS, findoutSelectedTypeAtom } from "../models/auth.model"
import { Typography } from "@repo/ui/typography"
import { LANDING_URL } from "@/shared/env"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select"
import { Input } from "@repo/ui/input"
import { ReactNode, useState } from "react"
import { Checkbox } from "@repo/ui/checkbox"
import { Button } from "@repo/ui/button"
import { SeedPhrase, SeedPhraseFooter, SeedPhraseHeader, SeedPhraseBody } from "@/shared/ui/seed-phrase"
import { IconCheck, IconDownload, IconX } from "@tabler/icons-react"
import { type AuthRegisterType, registerNavigationModel, register, registerSeedPhraseModel, registerState } from "../models/register.model"
import { IconLoader } from "@/shared/ui/icon-loader"
import { spawn } from "@reatom/framework"

const FindoutReferrerInput = reatomComponent(({ ctx }) => {
  const variant = ctx.spy(authState.errorsType).includes("findout") ? "danger" : "default"

  return (
    <Input
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      autoComplete="new-referrer"
      placeholder="Никнейм"
      variant={variant}
      className="w-full"
      value={ctx.spy(authState.fields.findout) ?? ""}
      onClick={() => auth.resetError(ctx)}
      onChange={e => authState.fields.findout(ctx, e.target.value)}
      maxLength={32}
    />
  )
}, "FindoutReferrerInput")

const FindoutOtherInput = reatomComponent(({ ctx }) => {
  const variant = ctx.spy(authState.errorsType).includes("findout") ? "danger" : "default"

  return (
    <Input
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      autoComplete="new-other"
      placeholder="Например: Telegram-канал"
      className="w-full"
      variant={variant}
      value={ctx.spy(authState.fields.findout) ?? ""}
      onClick={() => auth.resetError(ctx)}
      onChange={e => authState.fields.findout(ctx, e.target.value)}
      maxLength={128}
    />
  )
}, "FindoutOtherInput")

const FINDOUT_COMPONENTS: Record<AuthFindoutType, ReactNode> = {
  "referrer": <FindoutReferrerInput />,
  "custom": <FindoutOtherInput />
}

const FindoutOptions = reatomComponent(({ ctx }) => {
  const currentItem = ctx.spy(findoutSelectedTypeAtom)

  return (
    <Select
      value={currentItem?.value}
      onValueChange={v => authState.fields.findoutType(ctx, v as AuthFindoutType)}
    >
      <SelectTrigger className="min-h-10">
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
  const data = ctx.spy(authState.fields.findoutType)
  if (!data) return null;
  return FINDOUT_COMPONENTS[data]
}, "FindoutComponent")

const PrivacyTerms = reatomComponent(({ ctx }) => {
  return (
    <div className="inline-flex gap-2 items-start">
      <label htmlFor="rules" className="flex items-center relative">
        <Checkbox
          id="rules"
          checked={ctx.spy(authState.fields.acceptRules)}
          onCheckedChange={v => typeof v === 'boolean' && authState.fields.acceptRules(ctx, v)}
        />
      </label>
      <label className="select-none relative -top-1" htmlFor="rules">
        <Typography className="text-sm [&_a]:text-green-500 [&_a]:inline">
          Я согласен(-на) с положениями
          <a href="/legal/terms" target="_blank">
            &nbsp;пользовательского соглашения
          </a>,
          <a href="/legal/privacy" target="_blank">
            &nbsp;политикой конфиденциальности&nbsp;
          </a>
          и
          <a href={`${LANDING_URL}/rules`} target="_blank">
            &nbsp;правилами проекта
          </a>.
        </Typography>
      </label>
    </div>
  )
}, "PrivacyTerms")

const RegisterStartInput = () => {
  return (
    <>
      <div className="flex flex-col gap-2 w-full">
        <NicknameInput />
        <PasswordInput />
        <div className="flex flex-col gap-2 w-full">
          <FindoutOptions />
          <FindoutComponent />
        </div>
      </div>
      <PrivacyTerms />
    </>
  )
}

const RegisterSeedPhraseConfirm = reatomComponent(({ ctx }) => {
  const words = ctx.spy(registerSeedPhraseModel.state.repeatWords)
  const [isHidden, setIsHidden] = useState(true);

  return (
    <SeedPhrase
      words={words}
      isEditable={true}
      isHidden={isHidden}
      className="gap-6"
      onUpdateWord={(idx, value) => registerSeedPhraseModel.events.updateRepeatWords(ctx, value, idx)}
    >
      <SeedPhraseHeader onChangeVisibilityStatus={v => setIsHidden(v)}>
        <p className="text-neutral-400">
          Введите отсутствующие слова, чтобы подтвердить, что вы сохранили фразу
        </p>
      </SeedPhraseHeader>
      <SeedPhraseBody />
    </SeedPhrase>
  )
}, "RegisterSeedPhraseConfirm")

const RegisterSeedPhraseSave = reatomComponent(({ ctx }) => {
  const words = ctx.spy(registerSeedPhraseModel.state.words)
  const [isHidden, setIsHidden] = useState(true);

  return (
    <div className="flex flex-col w-full gap-4">
      <SeedPhrase
        isEditable={false}
        words={words}
        isHidden={isHidden}
        className="gap-6"
      >
        <SeedPhraseHeader onChangeVisibilityStatus={v => setIsHidden(v)}>
          <p className="text-neutral-400">
            Сохраните фразу в секретном месте.
            Она вам понадобится, если вы захотите восстановить доступ к аккаунту
          </p>
        </SeedPhraseHeader>
        <SeedPhraseBody />
        <SeedPhraseFooter>
          <div className="flex items-center justify-end w-full">
            <Button
              type="button"
              background="default"
              className="gap-2"
              onClick={() => register.downloadPhrase(ctx)}
            >
              Скачать
              <IconDownload size={16} />
            </Button>
          </div>
          <p className="text-neutral-400 text-xs text-center">
            Перед тем как показать свою фразу, убедитесь, что рядом с вами никого нет.
          </p>
        </SeedPhraseFooter>
      </SeedPhrase>
    </div>
  )
}, "RegisterSeedPhraseSave")

const RegisterConfirm = reatomComponent(({ ctx }) => {
  if (ctx.spy(register.submit.statusesAtom).isPending) {
    return <IconLoader />
  }

  const error = ctx.spy(authState.globalError)

  if (error) {
    return (
      <div className="flex flex-col gap-4 w-full items-center justify-center">
        <IconX size={32} className="text-red-600" />
        <p className="text-xl w-full sm:w-2/3 leading-5 font-semibold text-center">
          Что-то пошло не так
        </p>
      </div>
    )
  }

  if (!ctx.spy(register.submit.dataAtom)) {
    return <IconLoader />
  }

  return (
    <div className="flex flex-col gap-6 w-full items-center justify-center">
      <div className="flex flex-col gap-4 w-full items-center justify-center">
        <IconCheck size={32} className="text-green-600" />
        <p className="text-xl w-full sm:w-2/3 leading-5 font-semibold text-center">
          Вы успешно зарегистрировались на проекте Fasberry!
        </p>
      </div>
      <Button
        className="w-2/3 font-semibold"
        background="white"
        onClick={() => authState.type(ctx, "login")}
      >
        Перейти к входу
      </Button>
    </div >
  )
}, "RegisterConfirm")

const RegisterBack = reatomComponent(({ ctx }) => {
  const canGoBack = ctx.spy(registerNavigationModel.canGoBackAtom)

  return (
    <Button
      type="button"
      disabled={!canGoBack}
      onClick={() => spawn(ctx, (spawnCtx) => registerNavigationModel.events.back(spawnCtx))}
      background="default"
      className="transition-none"
    >
      Назад
    </Button>
  )
}, "RegisterBack")

const RegisterContinue = reatomComponent(({ ctx }) => {
  const canGoNext = ctx.spy(registerNavigationModel.canGoNextAtom);

  return (
    <Button
      type="button"
      className="w-full bg-green-600 font-semibold transition-none"
      disabled={!canGoNext}
      onClick={() => spawn(ctx, (spawnCtx) => registerNavigationModel.events.continue(spawnCtx))}
    >
      Продолжить
    </Button>
  )
}, "RegisterContinue")

const RegisterNavigation = reatomComponent(({ ctx }) => {
  const isLast = ctx.spy(registerNavigationModel.isLastStepAtom)
  if (isLast) return null;

  return (
    <div className="flex sm:flex-row flex-col items-center gap-2 justify-center w-full *:w-full">
      <RegisterBack />
      <RegisterContinue />
    </div>
  )
}, "RegisterNavigation")

const STEP_COMPONENTS: Record<AuthRegisterType, ReactNode> = {
  "start-input": <RegisterStartInput />,
  "seed-phrase-save": <RegisterSeedPhraseSave />,
  "seed-phrase-confirm": <RegisterSeedPhraseConfirm />,
  "confirm": <RegisterConfirm />
};

const RegisterContent = reatomComponent(({ ctx }) =>
  STEP_COMPONENTS[ctx.spy(registerState.type)],
  "RegisterContent"
)

export const RegisterForm = reatomComponent(({ ctx }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    spawn(ctx, (spawnCtx) => registerNavigationModel.events.continue(spawnCtx))
  }

  return (
    <form className="flex flex-col gap-4 w-full h-full" onSubmit={handleSubmit}>
      <RegisterContent />
      <RegisterNavigation />
    </form>
  )
}, 'RegisterForm')