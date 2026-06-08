import { LOGGING } from "#/shared/constants";
import { logger, validateLogger } from "../../shared/constants/logger";
import { isError } from "@repo/shared/lib/helpers"

export function logErrorMsg(e: unknown, { subject }: { subject?: string } = {}) {
  const loggerInstance = subject ? logger.withTag(subject) : logger;
  const error = isError(e) ? e.message : typeof e === "string" ? e : null;
  if (!error) return;
  loggerInstance.error(error)
}

export const logValidators = (n: string): void => LOGGING.validators ? void validateLogger.log(n) : void 0
