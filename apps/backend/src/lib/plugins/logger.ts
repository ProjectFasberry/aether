import { isProduction } from "#/shared/env";
import { logger as niceLogger } from "@tqman/nice-logger";
import { logger as bogeyLogger } from "@bogeychan/elysia-logger";

export const logger = isProduction ? bogeyLogger() : niceLogger();

export const loggerPlugin = () => logger