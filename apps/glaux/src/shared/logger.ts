import { logger, type Logger } from "@repo/shared/utils/logger";

export const appLogger = logger.child({ name: "app" });

export { type Logger, logger };
