import { client, withJsonBody } from "@/shared/lib/client-wrapper";
import { reatomAsync, withErrorAtom, withStatusesAtom } from "@reatom/async";
import { atom, AtomMut } from "@reatom/core";
import { withAssign } from "@reatom/framework";
import { authState } from "./auth.model";
import { createPhraseModel } from "./seed-phrase.model";
import { createNavigationModel } from "./navigation.model";
import { nicknameSchema, passwordSchema } from "@repo/shared/schemas/auth";
import * as z from "zod/v4"
import { navigate } from "vike/client/router";
import { authSecurity } from "./auth-security.model";

export type AuthRestoreType = "input-nickname" | "confirm-seed-phrase" | "set-new-password";

export const restoreSeedPhraseModel = createPhraseModel({ name: "authRestore" })

export const restoreState = atom(null, "restoreState").pipe(
  withAssign((_, name) => ({
    type: atom<AuthRestoreType>("input-nickname", `${name}.type`),
    setNewPassword: atom(null, `${name}.`).pipe(
      withAssign(() => ({
        value: atom<string>(""),
        repeatValue: atom<string>("")
      }))
    )
  }))
)

export const restore = atom(null, "restore").pipe(
  withAssign((_, name) => ({
    cb: atom(null, `${name}.cb`).pipe(
      withAssign((_, name) => ({
        confirmSeedPhrase: reatomAsync(async (ctx) => {
          const nickname = ctx.get(authState.fields.nickname);
          const mn = authSecurity.generateMnemonic(ctx)
          const hash = await authSecurity.mnToHash(ctx, mn)

          return await ctx.schedule(() =>
            client
              .post("auth/restore/validate")
              .pipe(
                withJsonBody({
                  hash,
                  nickname,
                })
              )
              .exec()
          )
        }, {
          name: `${name}.submit`,
          onFulfill: (ctx, res) => {

          },
        }).pipe(
          withStatusesAtom(),
          withErrorAtom()
        ),
        setNewPassword: reatomAsync(async (ctx) => {
          return await client
            .post("auth/restore/set-new-password")
            .exec()
        }, {
          name: `${name}.setNewPassword`,
          onFulfill: (ctx, res) => {

          }
        }).pipe(
          withStatusesAtom(),
          withErrorAtom()
        ),
      }))
    ),
    validators: atom(null, `${name}.validators`).pipe(
      withAssign(() => ({
        nickname: atom((ctx) =>
          z.safeParse(nicknameSchema, ctx.spy(authState.fields.nickname)).success,
        ),
        seedPhrase: restoreSeedPhraseModel.state.isValid("default"),
        setNewPassword: atom((ctx) => {
          const value = ctx.spy(restoreState.setNewPassword.value)
          const result = z.safeParse(passwordSchema, value)
          if (!result.success) return false;
          
          return value === ctx.spy(restoreState.setNewPassword.repeatValue)
        })
      }))
    )
  }))
)

export const restoreNavigationModel = createNavigationModel({
  steps: [
    {
      id: "input-nickname",
      validators: {
        toNext: restore.validators.nickname,
      },
    },
    {
      id: "confirm-seed-phrase",
      cb: restore.cb.confirmSeedPhrase,
      validators: {
        toNext: restore.validators.seedPhrase,
        toBack: false
      }
    },
    {
      id: "set-new-password",
      cb: restore.cb.setNewPassword,
      validators: {
        toNext: restore.validators.setNewPassword,
        toBack: false
      }
    }
  ],
  name: "authRestore",
  typeAtom: restoreState.type as AtomMut<string>,
  opts: {
    fallbackNext: () => navigate("/auth"),
    depsWithLast: false
  }
})