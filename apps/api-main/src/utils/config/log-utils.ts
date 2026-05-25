import { logger } from "./logger";

export function logErrorMsg(e: Error | unknown) {
  if (e instanceof Error) logger.error(e.message)
}