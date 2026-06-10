import { invariant } from "@repo/shared/lib/utils";
import type { DB } from "@repo/shared/types/db/general";
import type { Kysely } from "kysely";

type CreateUrlsSharedParams = {
  onFinish?: (data: Map<string, string>) => Awaitable<void>,
  onError?: (e: unknown) => void
}

let data: Map<string, string> | null = null;

export const createUrlsService = ({
  generalDb
}: {
  generalDb: Kysely<DB>
}) => {
  const WHITELIST_PREFIX = "_wl";

  async function fetchAndSetData(): Promise<Map<string, string>> {
    const query = await generalDb
      .selectFrom("ip_list")
      .select(["ip", "name"])
      .execute();

    data = new Map(query.map(({ name, ip }) => [name, ip]));
    return data;
  }

  return {
    getWhitelistIpList(): string[] {
      const currentData = this.getData();
      const result: string[] = [];

      for (const [key, value] of currentData) {
        if (key.startsWith(WHITELIST_PREFIX)) {
          result.push(value);
        }
      }

      return result;
    },
    getData(): Map<string, string> {
      invariant(data, "Urls cache is not initialized");

      if (data.size === 0) {
        console.warn("URLS cache is empty");
      }

      return data;
    },
    async init({ onFinish, onError }: CreateUrlsSharedParams = {}): Promise<void> {
      try {
        const freshData = await fetchAndSetData();
        await onFinish?.(freshData);
      } catch (e) {
        if (onError) {
          onError(e);
        } else {
          throw e;
        }
      }
    },
    async revalidate({ onError }: Pick<CreateUrlsSharedParams, "onError"> = {}): Promise<
      { ok: true; data: { upd: number; prev: number } } | { ok: false; error: unknown }
    > {
      const prev = data?.size ?? 0;

      try {
        const freshData = await fetchAndSetData();

        return {
          ok: true,
          data: { prev, upd: freshData.size }
        };
      } catch (error) {
        onError?.(error);
        return { ok: false, error };
      }
    },
  };
}
