import { invariant } from "#/helpers/invariant";
import { appLogger } from "#/utils/config/logger";
import { general } from "../database/general-db"

let urlsData: Map<string, string> | null = null

const WHITELIST_PREFIX = "_wl";

export function getWhitelistIpList(): string[] {
  const result: string[] = []

  for (const [key, value] of urls.get()) {
    if (key.startsWith(WHITELIST_PREFIX)) {
      result.push(value)
    }
  }

  return result
}

export const urls = {
  get() {
    invariant(urlsData, "Urls is not defined");
    if (urlsData.size === 0) console.warn("URLS is empty")
    return urlsData;
  },
  async init() {
    try {
      const query = await general
        .selectFrom("ip_list")
        .select(["ip", "name"])
        .execute();

      urlsData = new Map(query.map(({ name, ip }) => {
        appLogger.log(`URL for ${name} inited. Content: ${ip}`)
        return [name, ip]
      }))

      appLogger.success(`URLS inited. Loaded ${urlsData.size}`)
    } catch (e) {
      appLogger.error(e)
    }
  }
}