// @ts-expect-error
import Rcon from "modern-rcon";

import { logger } from "#/utils/config/logger";
import { RCON_PASSWORD } from "#/shared/env";
import { invariant } from "#/helpers/invariant";
import { getUrls } from "../constants/urls";

type RCON = {
	send: (message: string) => Promise<string>;
	connect: () => Promise<void>;
};

let client: RCON | null = null;

const rconLogger = logger.withTag("Rcon");

export function getRcon(): RCON {
	invariant(client, "Rcon client is not defined");
	return client;
}

export async function connectToRcon() {
	const urls = getUrls();

	try {
		const ip = urls.get("server_proxy");
		invariant(ip, "Server proxy ip is not defined");

		client = new Rcon(ip, RCON_PASSWORD);
		invariant(client, "RCON instance is not defined");

		await client.connect();

		rconLogger.success(`Connected to ${ip}`);
	} catch (e) {
		rconLogger.error(e);
	}
}
