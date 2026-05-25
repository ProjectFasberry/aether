import { reatomComponent } from "@reatom/npm-react";
import { type AuthRestoreType, restoreNavigationModel, restoreSeedPhraseModel, restoreState } from "../models/restore.model";
import { SeedPhrase, SeedPhraseBody } from "@/shared/ui/seed-phrase";
import { Typography } from "@/shared/ui/typography"
import { Button } from "@/shared/ui/button";
import { NicknameInput } from "./auth";
import { type ReactNode } from "react";
import { spawn } from "@reatom/framework";
import { Link } from "@/shared/components/config/link";
import { Input } from "@/shared/ui/input";

const RestoreSeedPhrase = reatomComponent(({ ctx }) => {
  const words = ctx.spy(restoreSeedPhraseModel.state.words);

  return (
    <>
      <div className="flex flex-col gap-1 w-full">
        <Typography className="text-base sm:text-lg font-medium leading-5">
          Для восстановления пароля вам потребуется ввести 12 слов (сид-фраза)
        </Typography>
        <span className="text-neutral-400 text-sm leading-4">
          Эти слова были выданы при регистрации аккаунта
        </span>
      </div>
      <SeedPhrase
        words={words}
        onUpdateWord={(idx, value) => restoreSeedPhraseModel.events.updateWords(ctx, value, idx)}
      >
        <SeedPhraseBody />
      </SeedPhrase>
      <div className="flex items-center justify-center w-full">
        <Link href="/support">Я потерял сид-фразу</Link>
      </div>
    </>
  )
}, "RestoreSeedPhrase")

const RestoreNickname = () => {
  return (
    <>
      <div className="flex flex-col gap-1 w-full">
        <Typography className="text-base sm:text-lg font-medium leading-5">
          Введите никнейм
        </Typography>
        <span className="text-neutral-400 text-sm leading-4">
          Никнейм должен быть указан точно
        </span>
      </div>
      <NicknameInput />
    </>
  )
}

const RestoreSetNewPassword = reatomComponent(({ ctx }) => {
  return (
    <>
      <div className="flex flex-col gap-1 w-full">
        <Typography className="text-base sm:text-lg font-medium leading-5">
          Введите никнейм
        </Typography>
        <span className="text-neutral-400 text-sm leading-4">
          Никнейм должен быть указан точно
        </span>
      </div>
      <div className="flex flex-col w-full gap-1">
        <Input
          placeholder="Новый пароль"
          value={ctx.spy(restoreState.setNewPassword.value)}
          onChange={e => restoreState.setNewPassword.value(ctx, e.target.value)}
          type="password"
          maxLength={64}
        />
        <Input
          placeholder="Повторите пароль"
          value={ctx.spy(restoreState.setNewPassword.repeatValue)}
          onChange={e => restoreState.setNewPassword.repeatValue(ctx, e.target.value)}
          type="password"
          maxLength={64}
        />
      </div>
    </>
  )
}, "RestoreSetNewPassword")

const STEP_COMPONENTS: Record<AuthRestoreType, ReactNode> = {
  "input-nickname": <RestoreNickname />,
  "confirm-seed-phrase": <RestoreSeedPhrase />,
  "set-new-password": <RestoreSetNewPassword />
};

const RestoreContent = reatomComponent(({ ctx }) =>
  STEP_COMPONENTS[ctx.spy(restoreState.type)], "RestoreContent"
)

const RestoreBack = reatomComponent(({ ctx }) => {
  const canGoBack = ctx.spy(restoreNavigationModel.canGoBackAtom)
  
  return (
    <Button
      type="button"
      disabled={!canGoBack}
      onClick={() => spawn(ctx, (spawnCtx) => restoreNavigationModel.back(spawnCtx))}
      background="default"
      className="transition-none"
    >
      Назад
    </Button>
  )
}, "RestoreBack")

const RestoreContinue = reatomComponent(({ ctx }) => {
  const canGoNext = ctx.spy(restoreNavigationModel.canGoNextAtom);

  return (
    <Button
      type="button"
      className="font-semibold"
      background="white"
      disabled={!canGoNext}
      onClick={() => spawn(ctx, (spawnCtx) => restoreNavigationModel.next(spawnCtx))}
    >
      Подтвердить
    </Button>
  )
}, "RestoreContinue")

const RestoreNavigation = reatomComponent(({ ctx }) => {
  return (
    <div className="flex sm:flex-row flex-col items-center gap-2 justify-center w-full *:w-full">
      <RestoreBack />
      <RestoreContinue />
    </div>
  )
}, "RestoreNavigation")

export const RestoreForm = reatomComponent(({ ctx }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    spawn(ctx, (spawnCtx) => restoreNavigationModel.next(spawnCtx))
  }

  return (
    <form
      className="flex flex-col gap-4 w-full p-3 sm:p-4 lg:p-6 max-w-xl rounded-lg bg-neutral-900 inert:opacity-70 inert:pointer-events-none"
      inert={false}
      onSubmit={handleSubmit}
    >
      <RestoreContent />
      <RestoreNavigation />
    </form>
  )
}, "RestoreForm")