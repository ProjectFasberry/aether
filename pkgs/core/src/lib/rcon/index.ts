// @ts-expect-error
import Rcon from "modern-rcon";
import { invariant } from "@repo/shared/lib/utils";

type RCON = {
  send: (message: string) => Promise<string>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

type CreateRconSharedParams = {
  onSuccess?: () => void,
  onError?: (e: unknown) => void,
}

let instance: RCON | null = null;

export const createRconService = ({ config }: { config: { RCON_PASSWORD: string, RCON_IP: Gettable<string> } }) => {
  return {
    getInstance(): RCON {
      invariant(instance, "Rcon client is not defined");
      return instance;
    },
    async connect({ onSuccess, onError }: CreateRconSharedParams = {}) {
      if (instance) {
        console.warn("RCON connect called but instance is already connected");
        return;
      }

      const opts = {
        password: config.RCON_PASSWORD,
        ip: typeof config.RCON_IP === "function" ? config.RCON_IP() : config.RCON_IP,
      }

      try {
        instance = new Rcon(opts.ip, opts.password);
        invariant(instance, "RCON instance is not defined");

        await instance.connect();

        onSuccess?.();
      } catch (e) {
        if (onError) {
          onError(e);
        } else {
          throw e
        }
      }
    },
    async disconnect({ onSuccess, onError }: CreateRconSharedParams = {}) {
      if (!instance) {
        console.warn("RCON disconnect called but instance is null");
        return;
      }

      try {
        await instance.disconnect();
        onSuccess?.();
      } catch (e) {
        if (onError) {
          onError(e);
        } else {
          throw e
        }
      } finally {
        instance = null;
      }
    }
  }
}
