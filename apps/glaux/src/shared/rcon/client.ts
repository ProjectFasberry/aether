import { invariant } from "@repo/shared/lib/utils";
import { urlsService } from "../bot/urls";
import { env } from "../env";
import { createRconService } from "@repo/core/lib/rcon/index";

export const rcon = createRconService({
	config: {
		RCON_PASSWORD: env.RCON_PASSWORD,
		RCON_IP: (): string => {
			const ip = urlsService.getData().get("server-proxy");
			invariant(ip, "Server proxy ip is not defined");
			return ip;
		},
	},
});
