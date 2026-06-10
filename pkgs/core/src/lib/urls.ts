import { invariant } from "@repo/shared/lib/utils";
import type { DB } from "@repo/shared/types/db/general";
import type { Kysely } from "kysely";
import { logger } from "@repo/shared/utils/logger";

type CreateUrlsSharedParams = {
  onFinish?: (data: Map<string, string>) => Awaitable<void>,
  onError?: (e: unknown) => void,
  print?: boolean
}

let data: Map<string, string> | null = null;

export const createUrlsService = ({
  generalDb
}: {
  generalDb: Kysely<DB>
}) => {
  const WHITELIST_PREFIX = "_wl";

  async function fetchAndSetData(): Promise<{ prev: typeof data; current: Map<string, string> }> {
    const prev = data;

    const query = await generalDb
      .selectFrom("ip_list")
      .select(["ip", "name"])
      .execute();

    data = new Map(query.map(({ name, ip }) => [name, ip]));

    return { prev, current: data };
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
    async init({ onFinish, onError, print }: CreateUrlsSharedParams = { print: false }): Promise<void> {
      try {
        const freshData = await fetchAndSetData();
        await onFinish?.(freshData.current);

        if (print) {
          if (!data) {
            logger.warn("URLS cache is empty");
            return;
          }

          const dataStr = Array.from(data).map(([name, ip]) => `${name}: ${ip}`).join("\n");
          logger.info(dataStr, { title: "Urls", asBox: true });
        }
      } catch (e) {
        if (onError) {
          onError(e);
        } else {
          throw e;
        }
      }
    },
    async revalidate({ onError }: Pick<CreateUrlsSharedParams, "onError"> = {}): Promise<
      { ok: true; data: { current: Map<string, string>; prev: Map<string, string> | null } } | { ok: false; error: unknown }
    > {
      try {
        const freshData = await fetchAndSetData();

        return {
          ok: true,
          data: { prev: freshData.prev, current: freshData.current }
        };
      } catch (error) {
        onError?.(error);
        return { ok: false, error };
      }
    },
  };
}
