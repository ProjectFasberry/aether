import { sql } from "kysely";
import { general } from "#/shared/database/general-db";
import { urlsService } from "./urls";

/**
 * Runtime configuration that used to live in env. It sits in `ip_list` next to
 * the other hosts (`domain`, `api-main-host`, `server-proxy`), so changing a URL
 * does not need a redeploy. Env stays only as the seed for the first boot.
 */
export type UrlConfigKey = "frontend-url" | "map-url";

const SEEDS: Record<UrlConfigKey, string | undefined> = {
  "frontend-url": Bun.env.FRONTEND_URL,
  "map-url": Bun.env.MAP_URL,
};

/** Inserts missing rows from env; existing rows always win. */
export async function ensureUrlConfig(): Promise<void> {
  for (const [name, value] of Object.entries(SEEDS) as [UrlConfigKey, string | undefined][]) {
    if (!value) continue;

    await sql`
      insert into ip_list (name, ip)
      select ${name}, ${value}
      where not exists (select 1 from ip_list where name = ${name})
    `.execute(general);
  }
}

export function getUrlConfig(name: UrlConfigKey): string | null {
  try {
    return urlsService.getData().get(name) ?? null;
  } catch {
    return null;
  }
}
