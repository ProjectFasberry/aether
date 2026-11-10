import Elysia from "elysia";
import { cors } from "@elysia/cors";
import { logger } from "@tqman/nice-logger";
import { clientIp } from "#/shared/services/client-ip";
import { getUrlConfig } from "#/shared/services/config";

export { requestIdPlugin } from "./request-id";

/**
 * Browser origins allowed to call the API with credentials.
 *
 * The web app is same-site with the API (both under `fasberry.fun`), the
 * launcher webview runs from a Tauri origin. Everything else is rejected:
 * reflecting any origin with `credentials: true` lets any site act as the
 * logged-in user (CSRF).
 */
/** Only the client platform is fixed here; every web origin comes from config. */
const CLIENT_ORIGINS = [
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
] as const;

function getAllowedOrigins(): string[] {
  const origins = new Set<string>(CLIENT_ORIGINS);

  // `frontend-url` may still be a template (`http://${DEV_HOST}:3006`).
  const webappClient = getUrlConfig("frontend-url");
  if (webappClient && !webappClient.includes("${")) {
    origins.add(webappClient);
  }

  // Extra origins (the landing page, a preview host, ...) are runtime config,
  // so moving to another domain is a config change, not a redeploy.
  const extra = getUrlConfig("cors-origins");

  if (extra) {
    for (const origin of extra.split(",")) {
      const value = origin.trim();
      if (value) {
        origins.add(value);
      }
    }
  }

  return [...origins];
}

export const isAllowedOrigin = (origin: string) =>
  getAllowedOrigins().includes(origin);

export const corsPlugin = () => new Elysia().use(
  cors({
    credentials: true,
    origin: getAllowedOrigins(),
  }),
);

export const loggerPlugin = () => logger();

/**
 * `ip` from the edge, normalised once for every module. `elysia-ip` returned the
 * raw header, which behind a proxy can be a comma list and is client-influenced.
 */
export const ipPlugin = () => new Elysia({ name: "ipPlugin" })
  .derive(({ headers }) => ({
    ip: clientIp(headers as Record<string, string | undefined>),
  }))
  // The plugin is mounted both on the root app and per route; `global` keeps
  // `ip` in the context after Elysia deduplicates it by name.
  .as("global");
