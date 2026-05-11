import { withHistory } from "@/shared/lib/reatom/helpers";
import { action, atom, type Ctx } from "@reatom/framework";
import { reatomRecord, withAssign, withReset } from "@reatom/framework";
import { withSearchParamsPersist } from "@reatom/url";
import { pof } from "../../../../models/shared.model";
import { spyOptionAtom } from "@/shared/models/app/utils";

export type AuthType = "register" | "login";
export type AuthErrorType = "nickname" | "password" | "findout";
export type AuthFindoutType = "referrer" | "custom";

export const authState = atom(null, "authState").pipe(
	withAssign((_, name) => ({
		type: atom<AuthType>("login", `${name}.type`).pipe(
			withHistory(),
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

export const isPofActiveAtom = atom((ctx) =>
	spyOptionAtom(ctx, "flags", "isPof", true) ? ctx.spy(pof.showTokenVerifySectionAtom) : false,
);

export const authIsDisabledAtom = atom((ctx) =>
	ctx.spy(isPofActiveAtom) || ctx.spy(authState.isProcessing),
);

export const auth = atom(null, "auth").pipe(
	withAssign((_, name) => ({
		resetErrors: action((ctx) => {
			authState.globalError.reset(ctx);
			authState.errorsType.reset(ctx);
		}),
		resetError: action((ctx) => {
			const errors = ctx.get(authState.errorsType);

			for (const target of errors) {
				authState.errorsType(ctx, (state) => state.filter((error) => error !== target));
			}
		}, `${name}.resetError`),
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

const ERRORS_RECORDS = {
	auth: {
		"EXISTS": "Такой игрок уже зарегистрирован",
		"NOT_EXISTS": "Такой игрок не зарегистрирован",
		"PASSWORD_OR_LOGIN_INCORRECT": "Неверный никнейм или пароль",
	},
	system: {
		"AUTHORIZATION_DISABLED": "Авторизация недоступна",
		"IP_RESTRICTS": "Превышен лимит регистраций",
	},
	captcha: {
		"TOKEN_NOT_FOUND": "Нужна проверка",
		"PASSWORD_UNSAFE": "Пароль ненадежный",
	},
} as const;

type ScopeName = keyof typeof ERRORS_RECORDS;

export type ErrorKey = {
	[S in ScopeName]: keyof (typeof ERRORS_RECORDS)[S];
}[ScopeName] & string;

export function getError(key: ErrorKey): { scope: ScopeName; message: string } | null {
	for (const [name, errors] of Object.entries(ERRORS_RECORDS)) {
		if (key in errors) {
			return { scope: name as ScopeName, message: (errors as Record<string, string>)[key] };
		}
	}
	return null;
}

export const SCOPE_ACTIONS: Record<ScopeName, (ctx: Ctx) => void> = {
	auth: (ctx) => {
		authState.errorsType(ctx, (state) => [...state, "password"]);
		authState.errorsType(ctx, (state) => [...state, "nickname"]);
	},
	captcha: (ctx) => {
		pof.showTokenVerifySectionAtom(ctx, true);
		pof.token.reset(ctx);
	},
	system: () => { },
};