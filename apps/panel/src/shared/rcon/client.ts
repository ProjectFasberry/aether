// @ts-expect-error
import Rcon from "modern-rcon";
import { invariant } from "@repo/shared/lib/utils";
import { logger } from "../logger";
import { urls } from "../bot/urls";
import { env } from "../env";

type RCON = {
	send: (message: string) => Promise<string>;
	connect: () => Promise<void>;
};

let client: RCON | null = null;

const rconLogger = logger.withTag("Rcon");

export const rcon = {
	get(): RCON {
		invariant(client, "Rcon client is not defined");
		return client;
	},
	async connect() {
		const list = urls.get();

		try {
			const ip = list.get("server_proxy");
			invariant(ip, "Server proxy ip is not defined");

			client = new Rcon(ip, env.RCON_PASSWORD);
			invariant(client, "RCON instance is not defined");

			await client.connect();

			rconLogger.success(`Connected to ${ip}`);
		} catch (e) {
			rconLogger.error(e);
		}
	},
};
