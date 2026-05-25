import { invariant } from "@repo/shared/lib/utils";
import { general } from "../database";
import { appLogger } from "../logger";

let urlsData: Map<string, string> | null = null;

const WHITELIST_PREFIX = "_wl";

export function getWhitelistIpList(): string[] {
	const result: string[] = [];

	for (const [key, value] of urls.get()) {
		if (key.startsWith(WHITELIST_PREFIX)) {
			result.push(value);
		}
	}

	return result;
}

async function getUrlsQuery() {
	return general.selectFrom("ip_list").select(["ip", "name"]).execute();
}

export const urls = {
	get() {
		invariant(urlsData, "Urls is not defined");
		if (urlsData.size === 0) console.warn("URLS is empty");
		return urlsData;
	},
	async init() {
		try {
			const query = await getUrlsQuery();

			urlsData = new Map(
				query.map(({ name, ip }) => {
					appLogger.log(`URL for ${name} inited. Content: ${ip}`);
					return [name, ip];
				}),
			);

			appLogger.success(`URLS inited. Loaded ${urlsData.size}`);
		} catch (e) {
			appLogger.error(e);
		}
	},
	async revalidate(): Promise<
		{ ok: true; data: { upd: number; prev: number } } | { ok: false; error: unknown | Error }
	> {
		const prev = urlsData?.size ?? 0;

		try {
			const query = await getUrlsQuery();

			urlsData = new Map(
				query.map(({ name, ip }) => {
					appLogger.log(`URL for ${name} inited. Content: ${ip}`);
					return [name, ip];
				}),
			);

			return { ok: true, data: { prev, upd: urlsData.size ?? 0 } };
		} catch (e) {
			appLogger.error(e);
			return { ok: false, error: e };
		}
	},
};
