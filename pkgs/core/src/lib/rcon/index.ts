// @ts-expect-error
import Rcon from "modern-rcon";
import { isError } from "@repo/shared/lib/helpers"
import logger from "consola"
import { invariant } from "@repo/shared/lib/utils";

type RCON = {
	send: (message: string) => Promise<string>;
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
};

let instance: RCON | null = null;

export const createRcon = ({ config }: { config: { RCON_PASSWORD: string, RCON_IP: string | (() => string) } }) => ({
  logger: logger.withTag("rcon"),
  getInstance(): RCON {
    invariant(instance, "Rcon client is not defined");
    return instance;
  },
  async connect() {
    if (instance) return;

    const opts = {
      password: config.RCON_PASSWORD,
      ip: typeof config.RCON_IP === "function" ? config.RCON_IP() : config.RCON_IP,
    }

    try {
      instance = new Rcon(opts.ip, opts.password);
      invariant(instance, "RCON instance is not defined");

      await instance.connect();

      this.logger.success(`Connected to ${opts.ip}`);
    } catch (e) {
      this.logger.error("Connection error", isError(e) ? e.message : e);
    }
  },
  async disconnect() {
    if (!instance) {
      this.logger.warn("RCON disconnect called but instance is null");
      return;
    }

    try {
      await instance.disconnect();
      this.logger.log("Connection closed");
    } catch (e) {
      this.logger.error("Error during disconnecting", e);
    } finally {
      instance = null;
    }
  }
});
