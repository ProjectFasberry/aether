import { client, withJsonBody } from "@/shared/lib/client-wrapper";
import { reatomAsync, withErrorAtom, withStatusesAtom } from "@reatom/framework";
import { atom, type AtomMut } from "@reatom/framework";
import { withAssign } from "@reatom/framework";
import { authState } from "./auth.model";
import { createPhraseModel } from "./seed-phrase.model";
import { createNavigationModel } from "./navigation.model";
import { nicknameSchema, passwordSchema } from "@/shared/schemas/auth";
import { navigate } from "vike/client/router";
import { authSecurity } from "./auth-security.model";

export type AuthRestoreType = "input-nickname" | "confirm-seed-phrase" | "set-new-password";

export const restoreSeedPhraseModel = createPhraseModel({ name: "authRestore" })

export const restoreState = atom(null, "restoreState").pipe(
  withAssign((_, name) => ({
    type: atom<AuthRestoreType>("input-nickname", `${name}.type`),
    setNewPassword: atom(null, `${name}.`).pipe(
      withAssign((_, name) => ({
        value: atom<string>("", `${name}.value`),
        repeatValue: atom<string>("", `${name}.repeatValue`)
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
          const mn = await authSecurity.generateMnemonic(ctx)
          const hash = await authSecurity.mnToHash(mn)

          const result = await client
            .post("auth/restore/validate")
            .pipe(
              withJsonBody({
                hash,
                nickname,
              })
            )
            .exec()

          return true;
        }, {
          name: `${name}.submit`,
          onFulfill: (ctx, res) => {

          },
        }).pipe(
          withStatusesAtom(),
          withErrorAtom()
        ),
        setNewPassword: reatomAsync(async (ctx) => {
          const result = await client
            .post("auth/restore/set-new-password")
            .exec()

          return true
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
          nicknameSchema.safeParse(ctx.spy(authState.fields.nickname)).success,
        ),
        seedPhrase: restoreSeedPhraseModel.state.isValid("default"),
        setNewPassword: atom((ctx) => {
          const value = ctx.spy(restoreState.setNewPassword.value)
          const result = passwordSchema.safeParse(value)
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
  typeAtom: restoreState.type as AtomMut<string>,
  opts: {
    fallbackBack: () => navigate("/auth"),
    depsWithLast: false
  }
})
