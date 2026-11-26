import { general as generalDb } from "#/shared/database/general-db";
import { getEnv } from "#/shared/env";
import { natsService } from "#/shared/nats/client";
import { createServerStatusService } from "@repo/core/modules/status";

/** A backend answers `server.<origin>.ping` while it is running. */
const PING_TIMEOUT_MS = 1_000;

export const serverStatusService = createServerStatusService({
  config: {
    VOLUME_URL: getEnv().VOLUME_URL,
    isServerAlive: async (origin) => {
      const client = natsService.getOptionalInstance();
      // Without a NATS connection the proxy view is the best available data.
      if (!client) return null;

      try {
        await client.request(`server.${origin.toLowerCase()}.ping`, new Uint8Array(), {
          timeout: PING_TIMEOUT_MS,
        });
        return true;
      } catch {
        return false;
      }
    },
  },
  generalDb
})
