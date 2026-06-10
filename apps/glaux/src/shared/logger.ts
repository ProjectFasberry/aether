import { logger, type Logger } from "@repo/shared/utils/logger";

export const appLogger = logger.child("app");

export { type Logger, logger };
