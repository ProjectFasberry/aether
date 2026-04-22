import ky, { Options } from "ky";
import { API_PREFIX_URL, PANEL_API_PREFIX_URL } from "../env";

const baseConfig: Options = {
	credentials: "include",
	timeout: 4000,
	headers: import.meta.env.DEV ? { "x-forwarded-for": import.meta.env.VITE_FORWARDED_FOR } : {},
};

export const SKIP_HOOK_HEADER = "X-Skip-Error-Handling";

const hooksConfig: Options = {
	hooks: {
		afterResponse: [
			async (_request, _options, response) => {
				let skipHook = false;

				const reqHeaders = _request.headers;

				if (reqHeaders) {
					if (reqHeaders.get(SKIP_HOOK_HEADER) === "true") {
						skipHook = true;
					}
				}

				if (skipHook) return;

				if (!response.ok) {
					const json = await response.json();

					if (json && typeof json === "object" && "error" in json) {
						throw new Error(String((json as Record<string, unknown>).error));
					}

					throw new Error(response.statusText);
				}
			},
		],
	},
};

export const clientInstance = ky.create({
	...baseConfig,
	prefixUrl: API_PREFIX_URL,
	...hooksConfig,
});

export const panelClientInstance = ky.create({
	...baseConfig,
	prefixUrl: PANEL_API_PREFIX_URL,
	...hooksConfig,
});
