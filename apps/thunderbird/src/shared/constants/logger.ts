import { logger } from "@repo/shared/utils/logger";

export const appLogger = logger.child({ name: "app" });
export const validateLogger = logger.child({ name: "validation" });
