import ky, { Options } from "ky";
import { env } from "../env";

const baseConfig: Options = {
	credentials: "include",
	timeout: 4000,
	headers: import.meta.env.DEV ? { "x-forwarded-for": env.VITE_FORWARDED_FOR } : {},
};

export const SKIP_HOOK_HEADER = "X-Skip-Error-Handling";

const hooksConfig: Options = {
	hooks: {
		afterResponse: [
			async ({ response, request }) => {
				let skipHook = false;

				const reqHeaders = request.headers;

				if (reqHeaders) {
					if (reqHeaders.get(SKIP_HOOK_HEADER) === "true") {
						skipHook = true;
					}
				}

				if (skipHook) return;

				if (!response.ok) {
					const json = await response.json();
					if (!json) {
						throw new Error(response.statusText);
					}

					if (typeof json === 'object' && "error" in json) {
						type TypeboxError = {
							type: string,
							on: string,
							property: string,
							essage: string,
							summary: string,
							expected: { data: unknown[] },
							found: { data: unknown[] },
							errors: unknown[]
						}

						const error = json.error as TypeboxError

						if ("type" in error) {
							if (error.type === 'validation') {
								console.error(error);
								throw new Error(`Validation error with ${error.errors.length} errors`)
							}
						}
					}

					if (typeof json === "object" && "error" in json) {
						throw new Error(String((json as Record<string, unknown>).error));
					}
				}
			},
		],
	},
};

export const clientInstance = ky.create({
	...baseConfig,
	baseUrl: env.VITE_API_URL,
	...hooksConfig,
});

export const panelClientInstance = ky.create({
	...baseConfig,
	baseUrl: env.VITE_PANEL_API_PREFIX_URL,
	...hooksConfig,
});