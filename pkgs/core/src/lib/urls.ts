import consola from "consola"
import { invariant } from "@repo/shared/lib/utils";
import type { DB } from "@repo/shared/types/db/general";
import type { Kysely } from "kysely";

let data: Map<string, string> | null = null;

export const createUrls = ({
  generalDb
}: {
  generalDb: Kysely<DB>
}) => {
  return {
    async _getUrlsQuery() {
      return await generalDb
        .selectFrom("ip_list")
        .select(["ip", "name"])
        .execute();
    },
    getWhitelistIpList(): string[] {
      const WHITELIST_PREFIX = "_wl";

      const result: string[] = [];

      for (const [key, value] of this.getData()) {
        if (key.startsWith(WHITELIST_PREFIX)) {
          result.push(value);
        }
      }

      return result;
    },
    getData() {
      invariant(data, "Urls is not defined");

      if (data.size === 0) {
        console.warn("URLS is empty")
      }

      return data;
    },
    async init(
      { onFinish, onError }: { onFinish?: () => void, onError?: () => void } = {}
    ) {
      try {
        const query = await this._getUrlsQuery();
        data = new Map(query.map(({ name, ip }) => [name, ip]));

        const dataStr = query.map((value) => `${value.name}: ${value.ip}`).join("\n");
        consola.box({ title: ` Urls `, message: dataStr })

        onFinish?.()
      } catch (e) {
        onError?.() ?? consola.error("Init error", e)
      }
    },
    async revalidate(
      { onError }: { onError?: () => void } = {}
    ): Promise<
      { ok: true; data: { upd: number; prev: number } } | { ok: false; error: unknown | Error }
    > {
      const prev = data?.size ?? 0;

      try {
        const query = await this._getUrlsQuery();
        data = new Map(query.map(({ name, ip }) => [name, ip]));
        return { ok: true, data: { prev, upd: data.size ?? 0 } };
      } catch (e) {
        onError?.() ?? consola.error("Revalidation error", e)
        return { ok: false, error: e };
      }
    },
  };
}
