import { withHistory } from "@/shared/lib/reatom-helpers";
import { reatomAsync, withStatusesAtom } from "@reatom/async";
import { action, atom, batch, Ctx } from "@reatom/core";
import { reatomRecord, sleep, withAssign, withReset } from "@reatom/framework";
import { toast } from "sonner";
import { logError } from "@/shared/lib/log";
import { client, withJsonBody } from "@/shared/lib/client-wrapper";
import * as z from "zod/v4";
import { registerSchema, authSchema as loginSchema } from "@repo/shared/schemas/auth";
import { withSearchParamsPersist } from "@reatom/url";
import { pof } from "./pof.model";

export type AuthTypeAtom = "register" | "login";
type ErrorType = "nickname" | "password" | "findout";
type FindoutType = "referrer" | "custom";

const DEFAULT_TYPE: AuthTypeAtom = "login";

export const typeAtom = atom<AuthTypeAtom>(DEFAULT_TYPE, "type").pipe(
	withHistory(),
	withSearchParamsPersist("type", (type = "login") => type),
);

export const nicknameAtom = atom<string>("", "nicknameAtom").pipe(withReset());
export const passwordAtom = atom<string>("", "passwordAtom").pipe(withReset());
export const passwordShowAtom = atom(false, "passwordShow");
export const findoutTypeAtom = atom<FindoutType | null>(null, "findoutType").pipe(withReset());

// Must be refererr nickname or other findout info
export const findoutAtom = atom<Maybe<string>>(undefined, "findoutAtom").pipe(withReset());

export const acceptRulesAtom = atom(false, "acceptRules").pipe(withReset());

export const authSearchParamsAtom = reatomRecord<Record<string, string>>({}, "authSearchParams");

export const globalErrorAtom = atom<Nullable<string>>(null, "globalError").pipe(withReset());
export const errorsTypeAtom = atom<ErrorType[]>([], "errorsType").pipe(withReset());

export const authIsProcessingAtom = atom(false, "authIsProcessing");

export const FINDOUT_OPTIONS: { title: string; value: FindoutType }[] = [
	{ title: "От другого игрока", value: "referrer" },
	{ title: "Другое", value: "custom" },
];

export const findoutSelectedTypeAtom = atom(
	(ctx) => FINDOUT_OPTIONS.find((d) => d.value === ctx.spy(findoutTypeAtom)) ?? null,
	"findoutSelected",
);

authSearchParamsAtom.onChange((ctx, state) => {
	const isReferrer = "referrer" in state;

	if (isReferrer) {
		findoutAtom(ctx, state.referrer);
		findoutTypeAtom(ctx, "referrer");
	}
});

typeAtom.onChange((ctx) => auth.resetErrors(ctx));

pof.token.onChange((ctx, state) => {
	if (state) {
		pof.showTokenVerifySectionAtom.reset(ctx);
	}
});

export const submitIsDisabledAtom = atom((ctx) => {
	const isPof = ctx.spy(pof.isActive) ? ctx.spy(pof.showTokenVerifySectionAtom) : false;

	const result = isPof || ctx.spy(authorizeAction.statusesAtom).isPending || !ctx.spy(authIsValidAtom);

	return result;
}, "submitIsDisabled");

export const authIsValidAtom = atom<boolean>((ctx) => {
	const type = ctx.spy(typeAtom);
	const nickname = ctx.spy(nicknameAtom);
	const password = ctx.spy(passwordAtom);

	const baseValid = nickname.length >= 2 && password.length >= 6;
	if (type !== "register") return baseValid;

	return baseValid && !!ctx.spy(findoutAtom) && !!ctx.spy(acceptRulesAtom);
}, "authIsValid");

export const authIsDisabledAtom = atom((ctx) => {
	const isPof = ctx.spy(pof.isActive) ? ctx.spy(pof.showTokenVerifySectionAtom) : false;

	const result = ctx.spy(authIsProcessingAtom) || isPof;
	return result;
}, "authIsDisabled");

export const auth = atom(null, "auth").pipe(
	withAssign((_, name) => ({
		register: action((ctx) => {
			ctx.schedule(() => auth.resetFull(ctx));
			typeAtom(ctx, "login");
			toast.success("Всё ок! Теперь войдите в аккаунт");
		}, `${name}.register`),
		login: action((ctx) => {
			ctx.schedule(() => window.location.reload());
		}, `${name}.login`),
		resetFull: action((ctx) => {
			batch(ctx, () => {
				nicknameAtom.reset(ctx);
				passwordAtom.reset(ctx);
				findoutAtom.reset(ctx);
				pof.token.reset(ctx);
				acceptRulesAtom.reset(ctx);
				globalErrorAtom.reset(ctx);
				errorsTypeAtom.reset(ctx);
				findoutTypeAtom.reset(ctx);
			});
		}, `${name}.resetFull`),
		resetErrors: action((ctx) => {
			globalErrorAtom.reset(ctx);
			errorsTypeAtom.reset(ctx);
		}, `${name}.resetErrors`),
		resetError: action((ctx) => {
			const errors = ctx.get(errorsTypeAtom);

			for (const target of errors) {
				errorsTypeAtom(ctx, (state) => state.filter((error) => error !== target));
			}
		}, `${name}.resetError`),
		solve: action(async (ctx, value: string) => {
			await ctx.schedule(() => sleep(1600));
			pof.token(ctx, value);
		}, `${name}.solve`),
	})),
);

const AUTH_TARGETS = {
	register: {
		schema: registerSchema,
		event: auth.register,
	},
	login: {
		schema: loginSchema,
		event: auth.login,
	},
};

const ERRORS = {
	auth: {
		exists: "Такой игрок уже зарегистрирован",
		"not-exists": "Такой игрок не зарегистрирован",
		invalid: "Неверный никнейм или пароль",
	},
	system: {
		"authorization-disabled": "Авторизация недоступна",
		"ip-limit": "Превышен лимит регистраций",
	},
	captcha: {
		"token-not-found": "Нужна проверка",
		unsafe: "Пароль ненадежный",
	},
} as const;

type ScopeName = keyof typeof ERRORS;

type ErrorKey = {
	[S in ScopeName]: keyof (typeof ERRORS)[S];
}[ScopeName] &
	string;

function getError(key: ErrorKey): { scope: ScopeName; message: string } | null {
	for (const [name, errors] of Object.entries(ERRORS)) {
		if (key in errors) {
			return { scope: name as ScopeName, message: (errors as Record<string, string>)[key] };
		}
	}
	return null;
}

const SCOPE_ACTIONS: Record<ScopeName, (ctx: Ctx) => void> = {
	auth: (ctx) => {
		batch(ctx, () => {
			errorsTypeAtom(ctx, (state) => [...state, "password"]);
			errorsTypeAtom(ctx, (state) => [...state, "nickname"]);
		});
	},
	captcha: (ctx) => {
		pof.showTokenVerifySectionAtom(ctx, true);
		pof.token.reset(ctx);
	},
	system: () => {},
};

export const authorizeAction = reatomAsync(
	async (ctx) => {
		const type = ctx.get(typeAtom);

		const raw = {
			nickname: ctx.get(nicknameAtom),
			password: ctx.get(passwordAtom),
			findout: ctx.get(findoutAtom),
			findoutType: ctx.get(findoutTypeAtom),
		};

		const pofIsActive = ctx.get(pof.isActive);
		const token = ctx.get(pof.token);

		if (pofIsActive) {
			if (!token) {
				pof.showTokenVerifySectionAtom(ctx, true);
				return;
			}
		}

		authIsProcessingAtom(ctx, true);

		const { success, error, data } = z.safeParse(AUTH_TARGETS[type].schema, raw);
		if (!success) return error;

		return await ctx.schedule(() =>
			client
				.post(`auth/${type}`, { searchParams: { token: token ?? "" }, throwHttpErrors: false, timeout: 10000 })
				.pipe(withJsonBody(data))
				.exec(),
		);
	},
	{
		name: "authorize",
		onFulfill: async (ctx, res) => {
			if (!res) return;

			if (res instanceof z.ZodError) {
				const issue = res.issues.map((d) => d)[0];
				const property = issue.path[0].toString() as ErrorType;

				batch(ctx, () => {
					globalErrorAtom(ctx, issue.message);
					errorsTypeAtom(ctx, (state) => [...state, property]);
				});

				authIsProcessingAtom(ctx, false);

				return;
			}

			const type = ctx.get(typeAtom);

			if (type === "register") {
				authIsProcessingAtom(ctx, false);
			}

			AUTH_TARGETS[type].event(ctx);
		},
		onReject: (ctx, e) => {
			logError(e);
			authIsProcessingAtom(ctx, false);

			if (e instanceof Error) {
				const error = getError(e.message as ErrorKey);

				if (!error) {
					console.warn("Unknown error", e.message);
					return;
				}

				const { scope, message } = error;

				globalErrorAtom(ctx, message);

				const action = SCOPE_ACTIONS[scope];
				action(ctx);
			}
		},
	},
).pipe(withStatusesAtom());

export const authTriggerIsDisabledAtom = atom((ctx) => {
	const r = ctx.spy(pof.isActive) ? !!ctx.spy(pof.token) : false;
	return r;
}, "authTriggerIsDisabled");
