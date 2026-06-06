// @ts-expect-error
import Rcon from "modern-rcon";
import { logger } from "#/shared/constants/logger";
import { env } from "#/shared/env";
import { urls } from "../constants/urls";
import { invariant } from "#/utils";
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
