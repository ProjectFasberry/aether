import { NicknameInput, PasswordInput } from "./auth"
import { reatomComponent } from "@reatom/npm-react"
import { auth, type AuthFindoutType, authState } from "../models/auth.model"
import { Typography } from "@repo/ui/typography"
import { env } from "@/shared/env"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select"
import { Input } from "@repo/ui/input"
import { type ReactNode, useState } from "react"
import { Checkbox } from "@repo/ui/checkbox"
import { Button } from "@repo/ui/button"
import { SeedPhrase, SeedPhraseFooter, SeedPhraseHeader, SeedPhraseBody } from "@/shared/ui/seed-phrase"
import { IconCheck, IconDownload, IconX } from "@tabler/icons-react"
import { type AuthRegisterType, registerNavigationModel, register, registerSeedPhraseModel, registerState, findoutSelectedTypeAtom, FINDOUT_OPTIONS } from "../models/register.model"
import { IconLoader } from "@/shared/ui/icon-loader"
import { spawn } from "@reatom/framework"
import { translate } from "@/shared/locales/helpers"

const FindoutReferrerInput = reatomComponent(({ ctx }) => (
  <Input
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck="false"
    autoComplete="new-referrer"
    placeholder={translate["auth.shared.placeholders.nickname"]()}
    variant={ctx.spy(authState.errorsType).includes("findout") ? "danger" : "default"}
    className="w-full"
    value={ctx.spy(authState.fields.findout) ?? ""}
    onClick={() => auth.resetError(ctx)}
    onChange={e => authState.fields.findout(ctx, e.target.value)}
    maxLength={32}
  />
), "FindoutReferrerInput")

const FindoutOtherInput = reatomComponent(({ ctx }) => (
  <Input
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck="false"
    autoComplete="new-other"
    placeholder={translate["auth.register.placeholders.findoutOther"]()}
    className="w-full"
    variant={ctx.spy(authState.errorsType).includes("findout") ? "danger" : "default"}
    value={ctx.spy(authState.fields.findout) ?? ""}
    onClick={() => auth.resetError(ctx)}
    onChange={e => authState.fields.findout(ctx, e.target.value)}
    maxLength={128}
  />
), "FindoutOtherInput")

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
          <SelectValue placeholder={translate["auth.register.placeholders.findout"]()} />
        )}
      </SelectTrigger>
      <SelectContent>
        {FINDOUT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.title}</SelectItem>
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
          {translate["auth.register.acceptRulesTitle"]()}
          <a href="/legal/terms" target="_blank">
            &nbsp;{translate["auth.register.acceptRulesPrivacy"]()}
          </a>,
          <a href="/legal/privacy" target="_blank">
            &nbsp;{translate["auth.register.acceptRulesProcessing"]()}&nbsp;
          </a>
          и
          <a href={`${env.VITE_LANDING_URL}/rules`} target="_blank">
            &nbsp;{translate["auth.register.acceptRulesProject"]()}
          </a>.
        </Typography>
      </label>
    </div>
  )
}, "PrivacyTerms")

const RegisterStartInput = () => (
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
          {translate["auth.register.seed-phrase.startTitle"]()}
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
            {translate["auth.register.seed-phrase.saveTitle"]()}
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
              {translate["auth.register.seed-phrase.download"]()}
              <IconDownload size={16} />
            </Button>
          </div>
          <p className="text-neutral-400 text-xs text-center">
            {translate["auth.register.seed-phrase.warning"]()}
          </p>
        </SeedPhraseFooter>
      </SeedPhrase>
    </div>
  )
}, "RegisterSeedPhraseSave")

const RegisterConfirm = reatomComponent(({ ctx }) => {
  if (ctx.spy(register.submit.statusesAtom).isPending) return <IconLoader />

  const error = ctx.spy(authState.globalError)

  if (error) {
    return (
      <div className="flex flex-col gap-4 w-full items-center justify-center">
        <IconX size={32} className="text-red-600" />
        <p className="text-xl w-full sm:w-2/3 leading-5 font-semibold text-center">
          {translate["auth.register.error"]()}
        </p>
      </div>
    )
  }

  if (!ctx.spy(register.submit.dataAtom)) return <IconLoader />

  return (
    <div className="flex flex-col gap-6 w-full items-center justify-center">
      <div className="flex flex-col gap-4 w-full items-center justify-center">
        <IconCheck size={32} className="text-green-600" />
        <p className="text-xl w-full sm:w-2/3 leading-5 font-semibold text-center">
          {translate["auth.register.success"]()}
        </p>
      </div>
      <Button
        className="w-2/3 font-semibold"
        background="white"
        onClick={() => authState.type(ctx, "login")}
      >
        {translate["auth.register.toLogin"]()}
      </Button>
    </div >
  )
}, "RegisterConfirm")

const RegisterBack = reatomComponent(({ ctx }) => {
  const canGoBack = ctx.spy(registerNavigationModel.canGoBackAtom);

  return (
    <Button
      type="button"
      disabled={!canGoBack || ctx.spy(registerNavigationModel.back.statusesAtom).isPending}
      onClick={() => spawn(ctx, (spawnCtx) => registerNavigationModel.back(spawnCtx))}
      background="default"
      className="transition-none capitalize"
    >
      {translate["shared.back"]()}
    </Button>
  )
}, "RegisterBack")

const RegisterContinue = reatomComponent(({ ctx }) => {
  const canGoNext = ctx.spy(registerNavigationModel.canGoNextAtom)

  return (
    <Button
      type="button"
      className="w-full bg-green-600 capitalize font-semibold transition-none"
      disabled={!canGoNext || ctx.spy(registerNavigationModel.next.statusesAtom).isPending}
      onClick={() => spawn(ctx, (spawnCtx) => registerNavigationModel.next(spawnCtx))}
    >
      {translate["shared.next"]()}
    </Button>
  )
}, "RegisterContinue")

const RegisterNavigation = reatomComponent(({ ctx }) => {
  if (ctx.spy(registerNavigationModel.isLastStepAtom)) return null;

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
  STEP_COMPONENTS[ctx.spy(registerState.type)], "RegisterContent"
)

export const RegisterForm = reatomComponent(({ ctx }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    spawn(ctx, (spawnCtx) => registerNavigationModel.next(spawnCtx))
  }

  return (
    <form className="flex flex-col gap-4 w-full h-full" onSubmit={handleSubmit}>
      <RegisterContent />
      <RegisterNavigation />
    </form>
  )
}, 'RegisterForm')