import { logging } from "#/shared/constants";
import { validateLogger } from "../../shared/constants/logger";
import { isError } from "@repo/shared/utils";
import { logger } from "@repo/shared/utils/logger";

export function logErrorMsg(e: unknown, { subject }: { subject?: string } = {}) {
  const loggerInstance = subject ? logger.child({ name: subject }) : logger;

  const error = isError(e) ? e.message : typeof e === "string" ? e : null;
  if (!error) return;

  loggerInstance.error(error)
}

export const logValidators = (n: string): void => logging.validators
  ? void validateLogger.info(n)
  : void 0
