// @ts-expect-error
import Rcon from "modern-rcon";
import { rconLogger } from "#/utils/config/logger";
import { RCON_PASSWORD } from "#/shared/env";
import { invariant } from "#/helpers/invariant";
import { urls } from "../constants/urls";

type RCON = {
	send: (message: string) => Promise<string>;
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
};

let instance: RCON | null = null;

export const rcon = {
	get(): RCON {
		invariant(instance, "Rcon client is not defined");
		return instance;
	},
	async connect() {
		if (instance) return;

		const list = urls.get();

		try {
			const ip = list.get("server_proxy");
			invariant(ip, "Server proxy ip is not defined");

			instance = new Rcon(ip, RCON_PASSWORD);
			invariant(instance, "RCON instance is not defined");

			await instance.connect();

			rconLogger.success(`Connected to ${ip}`);
		} catch (e) {
			rconLogger.error(e);
		}
	},
	async disconnect() {
		if (!instance) {
			rconLogger.warn("RCON disconnect called but instance is null");
			return;
		}

		try {
			await instance.disconnect();
			rconLogger.log("RCON connection closed");
		} catch (e) {
			rconLogger.error("Error during RCON disconnect:", e);
		} finally {
			instance = null;
		}
	}
}