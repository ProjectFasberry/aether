import { toast } from "sonner";
import { logger } from "./logger";
import { ENVIRONMENT } from "../consts";

export function logError(e: unknown, { type = 'console' }: { type?: 'console' | 'toast' | 'combined' } = {}) {
  if (!(e instanceof Error)) return;
  const msg = e.message;

  const EVENTS = {
    "console": null,
    "toast": () => void toast.error(msg),
    "combined": () => void toast.error(msg)
  }

  const exec = EVENTS[type]

  if (typeof exec === 'undefined') {
    console.warn('Skipped logging: invalid log type');
    return;
  }

  if (typeof exec === 'function') exec()
}

export function logRouting(path: string, hook: string): void {
  logger.withTag('Routing').log(`${path} called +${hook}`);
}

export function devLog(...args: Parameters<typeof logger["log"]>): void {
  if (import.meta.env.DEV) {
    logger.withTag("dev").log(...args)
  }
}

export const loggerWithEnv = logger.withTag(ENVIRONMENT);