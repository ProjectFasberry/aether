import { action, atom, AtomMut, reatomAsync, withAssign, withDataAtom, withReset, withStatusesAtom } from "@reatom/framework";
import { invariant } from "@/shared/lib/invariant";
import { registerSchema } from "@repo/shared/schemas/auth";
import { client } from "@/shared/lib/client-wrapper";
import { auth, authState, ErrorKey, getError, SCOPE_ACTIONS } from "./auth.model";
import { pof } from "../../../../models/shared.model";
import { logError } from "@/shared/lib/log";
import { isEmptyArray } from "@/shared/lib/utils";
import { createPhraseModel } from "./seed-phrase.model";
import { createNavigationModel } from "./navigation.model";
import { authSecurity } from "./auth-security.model";
import { getExistNickname } from "@/shared/models/shared.model";
import { appState } from "@/shared/models/app.model";

export type AuthRegisterType = |
  "start-input" |
  "seed-phrase-save" |
  "seed-phrase-confirm" |
  "confirm"

const fieldsOnlyRegisterSchema = registerSchema.omit({ hash: true })

export const registerSeedPhraseModel = createPhraseModel({ name: "authRegister" })

export const registerState = atom(null, "registerState").pipe(
  withAssign((_, name) => ({
    type: atom<AuthRegisterType>("start-input", `${name}.type`).pipe(withReset()),
    mn: atom<string | null>(null, `${name}.mn`).pipe(withReset()),
  }))
)

export const register = atom(null, "register").pipe(
  withAssign((_, name) => ({
    validators: atom(null, `${name}.validators`).pipe(
      withAssign(() => ({
        startInput: atom((ctx): boolean => {
          const acceptRules = ctx.spy(authState.fields.acceptRules)
          if (!acceptRules) return false

          const validationRes = fieldsOnlyRegisterSchema.safeParse({
            nickname: ctx.spy(authState.fields.nickname),
            password: ctx.spy(authState.fields.password),
            findout: ctx.spy(authState.fields.findout),
            findoutType: ctx.spy(authState.fields.findoutType)
          })
          
          return validationRes.success
        }),
        seedPhraseConfirmValidate: atom((ctx): boolean => false),
        confirmValidate: atom((ctx): boolean => false)
      }))
    ),
    cb: atom(null, `${name}.cb`).pipe(
      withAssign(() => ({
        seedPhraseConfirmValidate: action((ctx): boolean => {
          const rWords = ctx.get(registerSeedPhraseModel.state.repeatWords)
          const words = ctx.get(registerSeedPhraseModel.state.words)

          const isValid = rWords.length === words.length &&
            rWords.every((val, i) => val === words[i]);

          if (!isValid) {
            authState.globalError(ctx, "Введенные слова не совпадают");
            return false;
          }

          const pofIsActive = ctx.get(appState.options).pofEnabled;
          const token = ctx.get(pof.token);

          if (pofIsActive && !token) {
            pof.showTokenVerifySectionAtom(ctx, true);
            return false;
          }

          authState.isProcessing(ctx, true);

          register.submit(ctx, token);
          return true
        }),
        seedPhraseSaveGenerate: reatomAsync(async (ctx) => {
          const isExist = await getExistNickname(ctx.get(authState.fields.nickname))

          if (isExist) {
            authState.globalError(ctx, "Такой игрок уже зарегистрирован")
            return false;
          }

          authState.globalError.reset(ctx);

          const mn = authSecurity.generateMnemonic()

          registerSeedPhraseModel.state.words(ctx, mn.split(" "))
          registerState.mn(ctx, mn)

          return true;
        }),
        savePhraseConfirmStartValidate: action((ctx): boolean => {
          const words = ctx.get(registerSeedPhraseModel.state.words)

          const indices = [...Array(12).keys()]
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

          const arrFromCheck = words.map((w, idx) =>
            indices.includes(idx) ? "" : w
          );

          registerSeedPhraseModel.state.repeatWords(ctx, arrFromCheck)
          return true;
        }),
      }))
    ),
    submit: reatomAsync(async (ctx, token: string | null) => {
      authState.globalError.reset(ctx)

      const nickname = ctx.get(authState.fields.nickname)
      const password = ctx.get(authState.fields.password)
      const findout = ctx.get(authState.fields.findout)
      const findoutType = ctx.get(authState.fields.findoutType)

      const mn = ctx.get(registerState.mn)
      invariant(mn, 'Mn is not defined')

      const hash = await authSecurity.mnToHash(mn)

      const pd = {
        hash,
        password,
        nickname,
        findout,
        findoutType
      }

      const { success, error, data } = registerSchema.safeParse(pd);
      if (!success) return error;

      const res = await client
        .post<{ nickname: string }>("auth/register", {
          searchParams: { token: token ?? "" },
          json: data
        })
        .exec()

      return res;
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx, res) => register.afterEvent(ctx),
      onReject: (ctx, e) => {
        logError(e);
        authState.isProcessing(ctx, false);

        if (e instanceof Error) {
          const error = getError(e.message as ErrorKey);
          if (!error) return;

          const { scope, message } = error;
          authState.globalError(ctx, message);
          SCOPE_ACTIONS[scope](ctx)
        }
      }
    }).pipe(
      withStatusesAtom(),
      withDataAtom()
    ),
    downloadPhrase: action((ctx) => {
      const ph = ctx.get(registerSeedPhraseModel.state.words);
      if (isEmptyArray(ph)) return;

      const nickname = ctx.get(authState.fields.nickname)

      const fileContent = ph.join('\n');
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${nickname}-phrases.txt`

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }),
    resetRegisterState: action((ctx) => {
      registerState.mn.reset(ctx)
      registerState.type.reset(ctx);
      registerSeedPhraseModel.events.resetAll(ctx)
    }),
    afterEvent: action((ctx): void => {
      auth.resetAuthState(ctx)
      register.resetRegisterState(ctx)
      pof.token.reset(ctx);
    }),
  }))
)

export const registerNavigationModel = createNavigationModel({
  steps: [
    {
      id: "start-input",
      validators: {
        toNext: register.validators.startInput
      },
      cb: register.cb.seedPhraseSaveGenerate
    },
    {
      id: "seed-phrase-save",
      validators: {
        toNext: registerSeedPhraseModel.state.isValid("default")
      },
      cb: register.cb.savePhraseConfirmStartValidate
    },
    {
      id: "seed-phrase-confirm",
      cb: register.cb.seedPhraseConfirmValidate,
      validators: {
        toNext: registerSeedPhraseModel.state.isValid("repeat"),
        toBack: false
      },
    },
    {
      id: "confirm",
      validators: {
        toBack: false
      }
    }
  ],
  typeAtom: registerState.type as AtomMut<string>
})