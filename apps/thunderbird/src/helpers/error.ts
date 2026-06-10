import { isError } from "@repo/shared/lib/helpers";

const SHARED_INTERNAL_ERRORS = {
	INTERNAL_UNKNOWN: { msg: "Internal unknown error", code: 500 },
} as const;

export const withShared = <const T extends Record<string, BaseErrorItem>>(registry: T) => ({
	...SHARED_INTERNAL_ERRORS,
	...registry,
});

type BaseErrorItem = { msg: string; code: number };

type GroupedScopes<R extends Record<string, BaseErrorItem>> = {
	[K in R[keyof R]["code"]]: [Extract<keyof R, string>, ...Array<Extract<keyof R, string>>];
};

export function createError<Registry extends Record<string, BaseErrorItem>, FallbackKey extends keyof Registry>(
	registry: Registry,
	fallbackKey: FallbackKey,
) {
	const fallback = registry[fallbackKey];

	const codesGroup = {} as Record<number, string[]>;

	for (const [alias, item] of Object.entries(registry)) {
		if (!codesGroup[item.code]) {
			codesGroup[item.code] = [];
		}
		codesGroup[item.code].push(alias);
	}

	return {
		reader: (error: unknown): Registry[keyof Registry] => {
			const alias = isError(error) ? error.message : "";
			return (registry[alias] ?? fallback) as Registry[keyof Registry];
		},
		raise: (code: keyof Registry) => new Error(String(code)),
		scopes: codesGroup as unknown as GroupedScopes<Registry>,
	};
}
