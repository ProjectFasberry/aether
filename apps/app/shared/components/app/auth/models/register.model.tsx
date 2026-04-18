import { action, Atom, atom, batch, Ctx, reatomAsync, withAssign, withDataAtom, withReset, withStatusesAtom } from "@reatom/framework";
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { invariant } from "@/shared/lib/invariant";
import * as z from "zod/v4";
import { registerSchema } from "@repo/shared/schemas/auth";
import { client } from "@/shared/lib/client-wrapper";
import { auth, authState, ErrorKey, getError, SCOPE_ACTIONS } from "./auth.model";
import { pof } from "./pof.model";
import { logError } from "@/shared/lib/log";
import { isEmptyArray } from "@/shared/lib/array";

export type AuthRegisterType = |
  "start-input" |
  "seed-phrase-save" |
  "seed-phrase-confirm" |
  "confirm"

const fieldsOnlyRegisterSchema = registerSchema.omit({ mnHex: true })

export const registerState = atom(null, "registerState").pipe(
  withAssign((_, name) => ({
    type: atom<AuthRegisterType>("start-input", `${name}.type`).pipe(withReset()),
    mn: atom<string | null>(null, `${name}.mn`).pipe(withReset()),
    phraseIsComplete: atom(false, `${name}.phraseIsComplete`).pipe(withReset()),
    words: atom<string[]>([], `${name}.words`).pipe(withReset()),
    repeatWords: atom<string[]>([], `${name}.words`).pipe(withReset()),
    errors: atom<Record<string, string>>({}, `${name}.errors`).pipe(withReset()),
  }))
)

export const register = atom(null, "register").pipe(
  withAssign((_, name) => ({
    nav: atom(null, `${name}.nav`).pipe(
      withAssign(() => ({
        back: action((ctx): void => {
          const isFirst = ctx.get(isFirstStepAtom)
          if (isFirst) return

          const currIdx = ctx.get(currentIdxAtom);
          const prev = REGISTER_STEPS.find((_, idx) => idx === currIdx - 1)
          if (!prev) return;

          registerState.type(ctx, prev.id)
        }),
        continue: action((ctx): boolean => {
          const canGoNext = ctx.get(canGoNextAtom)
          if (!canGoNext) return false;

          const currIdx = ctx.get(currentIdxAtom);
          const next = REGISTER_STEPS[currIdx + 1];
          if (!next) return false;

          const curr = REGISTER_STEPS[currIdx]
          if (curr.cb && curr.cb(ctx) === false) return false;

          registerState.type(ctx, next.id)
          return true;
        }),
      }))
    ),
    validators: atom(null, `${name}.validators`).pipe(
      withAssign(() => ({
        startInput: atom((ctx): boolean => {
          const acceptRules = ctx.spy(authState.fields.acceptRules)
          if (!acceptRules) return false

          const validationRes = z.safeParse(fieldsOnlyRegisterSchema, {
            nickname: ctx.spy(authState.fields.nickname),
            password: ctx.spy(authState.fields.password),
            findout: ctx.spy(authState.fields.findout),
            findoutType: ctx.spy(authState.fields.findoutType)
          })

          return validationRes.success
        }),
        seedPhraseSave: atom((ctx): boolean => ctx.spy(registerState.phraseIsComplete)),
        seedPhraseConfirm: atom((ctx): boolean => ctx.spy(registerState.phraseIsComplete)),
        seedPhraseConfirmValidate: atom((ctx): boolean => false),
        confirmValidate: atom((ctx): boolean => false)
      }))
    ),
    cb: atom(null, `${name}.cb`).pipe(
      withAssign(() => ({
        seedPhraseConfirmValidate: action((ctx): boolean => {
          const rWords = ctx.get(registerState.repeatWords)
          const words = ctx.get(registerState.words)

          const isValid = rWords.length === words.length &&
            rWords.every((val, i) => val === words[i]);

          if (!isValid) {
            authState.globalError(ctx, "Введенные слова не совпадают");
            return false;
          }

          const pofIsActive = ctx.get(pof.isActive);
          const token = ctx.get(pof.token);

          if (pofIsActive && !token) {
            pof.showTokenVerifySectionAtom(ctx, true);
            return false;
          }

          authState.isProcessing(ctx, true);

          register.submit(ctx, token);
          return true
        }),
        seedPhraseSaveGenerate: action((ctx): boolean => {
          const mn = bip39.generateMnemonic(wordlist);

          registerState.words(ctx, mn.split(" "))
          registerState.mn(ctx, mn)

          return true;
        }),
        savePhraseConfirmStartValidate: action((ctx): boolean => {
          const words = ctx.get(registerState.words)

          const indices = [...Array(12).keys()]
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

          const arrFromCheck = words.map((w, idx) =>
            indices.includes(idx) ? "" : w
          );

          registerState.repeatWords(ctx, arrFromCheck)
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

      const seed = await bip39.mnemonicToSeed(mn);
      const mnHex = Array.from(seed)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const pd = {
        mnHex,
        password,
        nickname,
        findout,
        findoutType
      }

      const { success, error, data } = z.safeParse(registerSchema, pd);
      if (!success) return error;

      const res = await client
        .post<{ nickname: string }>("auth/register", {
          searchParams: {
            token: token ?? ""
          },
          json: data
        })
        .exec()

      return res;
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx, res) => {
        register.afterEvent(ctx)
      },
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
      const ph = ctx.get(registerState.words);
      if (isEmptyArray(ph)) return;

      const fileContent: string = ph.join('\n');
      const blob: Blob = new Blob([fileContent], { type: 'text/plain' });
      const url: string = URL.createObjectURL(blob);

      const nickname = ctx.get(authState.fields.nickname)
      const link: HTMLAnchorElement = document.createElement('a');
      link.href = url;
      link.download = `${nickname}-phrases.txt`

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }),
    resetRegisterState: action((ctx) => {
      batch(ctx, () => {
        registerState.mn.reset(ctx)
        registerState.words.reset(ctx)
        registerState.repeatWords.reset(ctx)
        registerState.type.reset(ctx);
        registerState.phraseIsComplete.reset(ctx);
        registerState.errors.reset(ctx);
      })
    }),
    afterEvent: action((ctx): void => {
      batch(ctx, () => {
        auth.resetAuthState(ctx)
        register.resetRegisterState(ctx)
        pof.token.reset(ctx);
      });
    }),
  }))
)

registerState.words.onChange((ctx, state) => {
  const hasErrors = Object.keys(ctx.get(registerState.errors)).length > 0;

  if (state.every(w => w.trim().length > 0) && !hasErrors) {
    return registerState.phraseIsComplete(ctx, true)
  }

  registerState.phraseIsComplete(ctx, false)
})

type RegisterSteps = {
  id: AuthRegisterType,
  validators?: {
    next?: Atom<boolean>,
    back?: Atom<boolean>
  }
  cb?: (ctx: Ctx) => boolean,
}

const REGISTER_STEPS: RegisterSteps[] = [
  {
    id: "start-input",
    validators: {
      next: register.validators.startInput
    },
    cb: register.cb.seedPhraseSaveGenerate
  },
  {
    id: "seed-phrase-save",
    validators: {
      next: register.validators.seedPhraseSave
    },
    cb: register.cb.savePhraseConfirmStartValidate
  },
  {
    id: "seed-phrase-confirm",
    cb: register.cb.seedPhraseConfirmValidate,
    validators: {
      next: register.validators.seedPhraseConfirm,
      back: register.validators.seedPhraseConfirmValidate
    },
  },
  {
    id: "confirm",
    validators: {
      back: register.validators.confirmValidate
    }
  }
]

export const currentIdxAtom = atom<number>((ctx) => REGISTER_STEPS.findIndex(s => s.id === ctx.spy(registerState.type)));
export const isLastStepAtom = atom<boolean>((ctx) => ctx.spy(currentIdxAtom) === REGISTER_STEPS.length - 1)
export const isFirstStepAtom = atom<boolean>((ctx) => ctx.spy(currentIdxAtom) === 0);

const createStepValidatorAtom = (type: 'next' | 'back') => atom((ctx) => {
  const step = REGISTER_STEPS[ctx.spy(currentIdxAtom)];
  const validator = step?.validators?.[type];
  return validator ? ctx.spy(validator) : true;
});
export const isStepNextValidAtom = createStepValidatorAtom('next');
export const isStepBackValidAtom = createStepValidatorAtom('back');

export const canGoBackAtom = atom<boolean>((ctx) => ctx.spy(isStepBackValidAtom) && !ctx.spy(isFirstStepAtom))
export const canGoNextAtom = atom<boolean>((ctx) => ctx.spy(isStepNextValidAtom) && !ctx.spy(isLastStepAtom));