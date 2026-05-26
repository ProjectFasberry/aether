import {
  action, atom, reatomAsync, spawn, withAssign, withDataAtom, withReset, withStatusesAtom,
  type AtomMut
} from "@reatom/framework";
import { invariant } from "@/shared/lib/invariant";
import { registerSchema } from "@/shared/schemas/auth";
import { client } from "@/shared/lib/client-wrapper";
import { auth, type AuthFindoutType, authState, defineError } from "./auth.model";
import { pof } from "../../../../models/shared.model";
import { logError } from "@/shared/lib/log";
import { isEmptyArray } from "@/shared/lib/helpers";
import { createPhraseModel } from "./seed-phrase.model";
import { createNavigationModel } from "./navigation.model";
import { authSecurity } from "./auth-security.model";
import { getExistNickname } from "@/shared/models/shared.model";
import { spyOptionAtom } from "@/shared/models/app/utils";
import { translate } from "@/shared/locales/helpers";
import * as z from "zod";
import { downloadFile } from "@/shared/lib/utils";

export type AuthRegisterType = |
  "start-input" |
  "seed-phrase-save" |
  "seed-phrase-confirm" |
  "confirm"

const fieldsOnlyRegisterSchema = z.intersection(
  registerSchema.omit({ hash: true }),
  z.object({ acceptRules: z.literal(true) })
)

export const registerSeedPhraseModel = createPhraseModel({ name: "register" })

export const registerState = atom(null, "registerState").pipe(
  withAssign((_, name) => ({
    type: atom<AuthRegisterType>("start-input", `${name}.type`).pipe(withReset()),
    mn: atom<string | null>(null, `${name}.mn`).pipe(withReset()),
    skipSeedPhrase: atom(false, `${name}.skipSeedPhrase`).pipe(withReset())
  }))
)
export const register = atom(null, "register").pipe(
  withAssign((_, name) => ({
    validators: {
      startInputValidate: atom((ctx): boolean =>
        fieldsOnlyRegisterSchema.safeParse({
          nickname: ctx.spy(authState.fields.nickname),
          password: ctx.spy(authState.fields.password),
          findout: ctx.spy(authState.fields.findout),
          findoutType: ctx.spy(authState.fields.findoutType),
          acceptRules: ctx.spy(authState.fields.acceptRules)
        }).success
      ),
      seedPhraseConfirmValidate: atom((): boolean => false),
      confirmValidate: atom((): boolean => false)
    },
    cb: {
      seedPhraseSaveGenerate: reatomAsync(async (ctx): Promise<boolean> => {
        const nickname = ctx.get(authState.fields.nickname);
        const isExist = await getExistNickname(nickname)

        if (isExist) {
          authState.globalError(ctx, "Такой игрок уже зарегистрирован")
          return false;
        }

        authState.globalError.reset(ctx);

        const mn = await authSecurity.generateMnemonic(ctx)

        registerSeedPhraseModel.state.words(ctx, mn.split(" "))
        registerState.mn(ctx, mn)

        return true;
      }, "_"),
      savePhraseConfirmStart: action((ctx): boolean => {
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
      seedPhraseConfirm: action((ctx): boolean => {
        const rWords = ctx.get(registerSeedPhraseModel.state.repeatWords)
        const words = ctx.get(registerSeedPhraseModel.state.words)

        const isValid = rWords.length === words.length &&
          rWords.every((val, i) => val === words[i]);

        if (!isValid) {
          authState.globalError(ctx, "Введенные слова не совпадают");
          return false;
        }

        const pofIsActive = spyOptionAtom(ctx, "flags", "isPof", true)
        const token = ctx.get(pof.token);

        if (!token && pofIsActive) {
          pof.showTokenVerifySectionAtom(ctx, true);
          return false;
        }

        authState.isProcessing(ctx, true);
        register.submit(ctx, token);

        return true
      }),
    },
    submit: reatomAsync(async (ctx, token: string | null) => {
      authState.globalError.reset(ctx)

      const base = {
        nickname: ctx.get(authState.fields.nickname),
        password: ctx.get(authState.fields.password),
        findout: ctx.get(authState.fields.findout),
        findoutType: ctx.get(authState.fields.findoutType)
      }

      const mn = ctx.get(registerState.mn)
      invariant(mn, 'Mn is not defined')

      const hash = await authSecurity.mnToHash(mn)
      const pd = { hash, ...base }

      const { success, error, data } = registerSchema.safeParse(pd);
      if (!success) throw error

      const res = await client
        .post<ExtractApiData<"postAuthRegister">["data"]>("auth/register", {
          searchParams: { token: token ?? "" },
          json: data
        })
        .exec()

      return res;
    }, {
      name: `${name}.submit`,
      onReject: (ctx, e) => {
        logError(e);

        const scope = defineError(ctx, e)

        if (scope === 'auth') {
          registerState.skipSeedPhrase(ctx, true)
        }
      },
      onSettle: (ctx) => {
        authState.isProcessing(ctx, false);
      }
    }).pipe(
      withStatusesAtom(),
      withDataAtom()
    ),
    downloadPhrase: action((ctx) => {
      const ph = ctx.get(registerSeedPhraseModel.state.words);
      if (isEmptyArray(ph)) return;

      const nickname = ctx.get(authState.fields.nickname)
      downloadFile(ph.join('\n'), `${nickname}-phrases.txt`)
    }),
    resetRegisterState: action((ctx) => {
      registerState.mn.reset(ctx)
      registerState.type.reset(ctx);
      registerState.skipSeedPhrase.reset(ctx);
      registerSeedPhraseModel.events.resetAll(ctx)
    }),
    toLogin: action((ctx) => {
      authState.type(ctx, "login")
      auth.resetAuthState(ctx)
      register.resetRegisterState(ctx)
      pof.token.reset(ctx);
    }),
    next: action((ctx) => {
      spawn(ctx, (spawnCtx) => {
        const skipPhrase = ctx.get(registerState.skipSeedPhrase);

        if (skipPhrase) {
          registerState.type(ctx, "confirm");

          const token = ctx.get(pof.token);
          register.submit(spawnCtx, token);
        }

        registerNavigationModel.next(spawnCtx)
      })
    })
  }))
)

export const registerNavigationModel = createNavigationModel({
  steps: [
    {
      id: "start-input",
      validators: {
        toNext: register.validators.startInputValidate
      },
      cb: register.cb.seedPhraseSaveGenerate
    },
    {
      id: "seed-phrase-save",
      validators: {
        toNext: registerSeedPhraseModel.state.isValid("default")
      },
      cb: register.cb.savePhraseConfirmStart
    },
    {
      id: "seed-phrase-confirm",
      cb: register.cb.seedPhraseConfirm,
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

export const FINDOUT_OPTIONS: { title: string; value: AuthFindoutType }[] = [
  { title: translate["auth.register.findout.referrer"](), value: "referrer" },
  { title: translate["auth.register.findout.custom"](), value: "custom" },
];

export const findoutSelectedTypeAtom = atom((ctx) =>
  FINDOUT_OPTIONS.find((d) => d.value === ctx.spy(authState.fields.findoutType)) ?? null,
);
