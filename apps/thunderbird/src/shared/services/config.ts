import { general } from "#/shared/database/general-db";
import { urlsService } from "./urls";

/**
 * Runtime configuration that used to live in env. It sits in `ip_list` next to
 * the other hosts (`domain`, `api-main-host`, `server-proxy`), so changing a URL
 * does not need a redeploy. Env stays only as the seed for the first boot.
 */
export type UrlConfigKey = "frontend-url" | "map-url" | "cors-origins";

const SEEDS: Record<UrlConfigKey, string | undefined> = {
  "frontend-url": Bun.env.FRONTEND_URL,
  "map-url": Bun.env.MAP_URL,
  // Comma separated extra browser origins allowed to call the API.
  "cors-origins": Bun.env.CORS_ORIGINS,
};

/** Inserts missing rows from env; existing rows always win. */
export async function ensureUrlConfig(): Promise<void> {
  for (const [name, value] of Object.entries(SEEDS) as [UrlConfigKey, string | undefined][]) {
    if (!value) continue;

    const existing = await general
      .selectFrom("ip_list")
      .select("id")
      .where("name", "=", name)
      .executeTakeFirst();

    if (!existing) {
      await general.insertInto("ip_list").values({ name, ip: value }).execute();
    }
  }
}

export function getUrlConfig(name: UrlConfigKey): string | null {
  try {
    return urlsService.getData().get(name) ?? null;
  } catch {
    return null;
  }
}
