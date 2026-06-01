import { invariant } from "@repo/shared/lib/utils";
import { urls } from "../bot/urls";
import { env } from "../env";
import { createRcon } from "@repo/core/lib/rcon/index"

export const rcon = createRcon({
  config: {
    RCON_PASSWORD: env.RCON_PASSWORD,
    RCON_IP: (): string => {
      const ip = urls.getData().get("server_proxy");
      invariant(ip, "Server proxy ip is not defined");
      return ip;
    }
  }
})
