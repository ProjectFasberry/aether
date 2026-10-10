import { logger } from "../utils/logger"

export function showRoutes<T extends { routes: { path: string; method: string, hooks: { detail?: { summary?: string, tags?: string[] } } }[] }>({ routes }: T) {
  const routesList = routes
    .map(({ path, method, hooks }) => `${path} - ${method} ${hooks.detail?.summary ?? ""} ${hooks.detail?.tags?.join(", ") ?? ""}`)
    .join('\n');

  if (logger) {
    logger.info(routesList, { title: `Routes (${routes.length})`, asBox: true })
  } else {
    console.log(`\n${routesList}\n`, routes.length)
  }
}

export function wrapError(e: unknown): { error: string } {
  const error = "Internal Server Error";

  if (typeof e === "object" && e !== null && "message" in e && typeof (e as any).message === "string") {
    try {
      const parsed = JSON.parse((e as any).message);

      if (typeof parsed === "object" && parsed !== null) {
        return { error: parsed };
      }

      return { error: (e as any).message };
    } catch {
      return { error: (e as any).message };
    }
  }

  if (typeof e === "string") {
    try {
      const parsed = JSON.parse(e);

      if (typeof parsed === "object" && parsed !== null) {
        return { error: parsed };
      }

      return { error: e };
    } catch {
      return { error: e };
    }
  }

  logger.error(error);

  return { error };
}
