import { appLogger } from "#/shared/constants/logger";

/** Everything the Yggdrasil module logs goes through this child logger. */
export const yggdrasilLogger = appLogger.child({ name: "yggdrasil" });
