import { action, atom, type Action } from "@reatom/framework";
import { reatomRecord, withAssign, withReset } from "@reatom/framework";
import { withSearchParamsPersist } from "@reatom/url";
import { pof } from "@/shared/models/shared.model";
import { spyOptionAtom } from "@/shared/models/app/utils";
import { isError } from "@/shared/lib/helpers";
import { logger } from "@/shared/lib/logger";

export type AuthType = "register" | "login";
export type AuthErrorType = "nickname" | "password" | "findout";
export type AuthFindoutType = "referrer" | "custom";

export const authState = atom(null, "authState").pipe(
  withAssign((_, name) => ({
    type: atom<AuthType>("login", `${name}.type`).pipe(
      withSearchParamsPersist("type", (type = "login") => type),
    ),
    searchParams: reatomRecord<Record<string, string>>({}, `${name}.searchParams`),
    fields: atom(null, `${name}.fields`).pipe(
      withAssign((_, name) => ({
        nickname: atom<string>("", `${name}.nickname`).pipe(withReset()),
        password: atom<string>("", `${name}.password`).pipe(withReset()),
        // Must be refererr nickname or other findout info
        findout: atom<Maybe<string>>(undefined, `${name}.findout`).pipe(withReset()),
        findoutType: atom<AuthFindoutType | null>(null, `${name}.findoutType`).pipe(withReset()),
        acceptRules: atom(false, `${name}.acceptRules`).pipe(withReset())
      }))
    ),
    settings: atom(null, `${name}.settings`).pipe(
      withAssign((_, name) => ({
        showPassword: atom(false, `${name}.showPassword`).pipe(withReset())
      }))
    ),
    globalError: atom<Nullable<string>>(null, `${name}.globalError`).pipe(withReset()),
    errorsType: atom<AuthErrorType[]>([], `${name}.errorsType`).pipe(withReset()),
    isProcessing: atom(false, `${name}.isProcessing`).pipe(withReset())
  }))
)

authState.searchParams.onChange((ctx, state) => {
  const isReferrer = "referrer" in state;

  if (isReferrer) {
    authState.fields.findout(ctx, state.referrer);
    authState.fields.findoutType(ctx, "referrer");
  }
});

authState.type.onChange((ctx) => auth.resetErrors(ctx));
pof.token.onChange((ctx, state) => state !== null && pof.showTokenVerifySectionAtom.reset(ctx))

export const auth = atom(null, "auth").pipe(
  withAssign(() => ({
    resetErrors: action((ctx) => {
      authState.globalError.reset(ctx);
      authState.errorsType.reset(ctx);
    }),
    resetError: action((ctx) => {
      const errors = ctx.get(authState.errorsType);

      for (const target of errors) {
        authState.errorsType(ctx, (state) => state.filter((error) => error !== target));
      }
    }),
    solve: action((ctx, value: string) => pof.token(ctx, value)),
    resetAuthState: action((ctx) => {
      authState.fields.nickname.reset(ctx);
      authState.fields.password.reset(ctx);
      authState.fields.findout.reset(ctx);
      authState.fields.findoutType.reset(ctx);
      authState.fields.acceptRules.reset(ctx);
      authState.globalError.reset(ctx);
      authState.errorsType.reset(ctx);
      authState.isProcessing.reset(ctx)
      authState.settings.showPassword.reset(ctx)

      pof.resetAll(ctx)
    })
  })),
);

export const authTriggerIsDisabledAtom = atom((ctx) =>
  spyOptionAtom(ctx, "flags", "isPof", true) ? Boolean(ctx.spy(pof.token)) : false,
);
export const isPofActiveAtom = atom((ctx) =>
  spyOptionAtom(ctx, "flags", "isPof", true) ? ctx.spy(pof.showTokenVerifySectionAtom) : false,
);
export const authIsDisabledAtom = atom((ctx) => ctx.spy(isPofActiveAtom) || ctx.spy(authState.isProcessing));

type ScopeName = "auth" | "global" | "captcha"

type AuthErrorsUnionEnum =
  | ExtractApiErr<"postAuthLoginBasic", 400>
  | ExtractApiErr<"postAuthRegister", 400>
  | "TOKEN_NOT_FOUND";

const AUTH_ERRORS: Record<ScopeName, Partial<Record<AuthErrorsUnionEnum, string>>> = {
  auth: {
    "AUTHORIZATION_DISABLED": "Авторизация недоступна",
    "IP_RESTRICTIONS": "Превышен лимит регистраций",
    "NOT_EXISTS": "Такой игрок не зарегистрирован",
    "PASSWORD_OR_LOGIN_INCORRECT": "Неверный никнейм или пароль",
    "PASSWORD_IS_UNSAFE": "Пароль ненадежный",
  },
  global: {
    "USER_EXISTS": "Такой игрок уже зарегистрирован",
  },
  captcha: {
    "TOKEN_NOT_FOUND": "Нужна проверка",
  },
}

const SCOPE_ACTIONS: Record<ScopeName, Action<[], void>> = {
  auth: action((ctx) => {
    authState.errorsType(ctx, (state) => [...state, "password"]);
    authState.errorsType(ctx, (state) => [...state, "nickname"]);
  }),
  global: action(() => { }),
  captcha: action((ctx) => {
    pof.showTokenVerifySectionAtom(ctx, true);
    pof.token.reset(ctx);
  })
};

export const defineError = action((ctx, e: Error | unknown): ScopeName | null => {
  if (!isError(e)) return null;

  type ErrorKey = { [S in ScopeName]: keyof (typeof AUTH_ERRORS)[S] }[ScopeName];

  function getError(key: ErrorKey): { scope: ScopeName; message: string } | null {
    for (const [name, errors] of Object.entries(AUTH_ERRORS)) {
      if (key in errors) {
        return { scope: name as ScopeName, message: (errors as Record<string, string>)[key] };
      }
    }
    return null;
  }

  const error = getError(e.message as ErrorKey);

  if (!error) {
    logger.error("Unknown error", e.message)
    authState.globalError(ctx, e.message);
    return null;
  }

  const { scope, message } = error;

  authState.globalError(ctx, message);
  SCOPE_ACTIONS?.[scope](ctx)

  return scope
}, "defineError")
