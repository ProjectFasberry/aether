import { env } from "#/shared/env";
import { urlsService } from "../constants/urls";
import { invariant } from "#/utils";
import { createRconService } from "@repo/core/lib/rcon/index"

export const rcon = createRconService({
  config: {
    RCON_PASSWORD: env.RCON_PASSWORD,
    RCON_IP: (): string => {
      const ip = urlsService.getData().get("server-proxy");
      invariant(ip, "Server proxy ip is not defined");
      return ip;
    }
  }
})
