import { logger } from "../../shared/constants/logger";
import { isError } from "@repo/shared/lib/helpers"

export function logErrorMsg(e: unknown) {
  if (isError(e)) {
    logger.error(e.message)
  }
}
