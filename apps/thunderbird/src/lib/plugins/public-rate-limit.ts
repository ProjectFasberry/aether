import Elysia from "elysia";
import { allowRequest } from "#/shared/services/rate-limit";
import { clientIp } from "#/shared/services/client-ip";

/**
 * Per-IP limit for the public surface (reads served to the website, launcher
 * and embeds). Authenticated and internal paths have their own buckets, and
 * endpoints that already throttle (Yggdrasil, auth, the vote webhook) or serve
 * many files (releases, avatars, the static bundle) are skipped.
 */
const SKIP_PREFIXES = [
  "/health",
  "/openapi",
  "/auth",
  "/privated",
  "/launcher",
  "/releases",
  "/avatars",
  "/static",
  "/yggdrasil",
  "/third-party",
  "/.well-known",
];

const LIMIT = {
  read: { limit: 120, window: 60 },
  write: { limit: 60, window: 60 },
} as const;

export const publicRateLimit = () =>
  new Elysia({ name: "publicRateLimit" }).onBeforeHandle(async ({ request, status }) => {
    if (request.method === "OPTIONS") return;

    const path = new URL(request.url).pathname;

    if (SKIP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return;
    }

    const headers = Object.fromEntries(request.headers) as Record<string, string | undefined>;
    const ip = clientIp(headers);
    const rule = request.method === "GET" || request.method === "HEAD" ? LIMIT.read : LIMIT.write;

    if (!(await allowRequest("public", ip, rule.limit, rule.window))) {
      throw status(429, { error: "TOO_MANY_REQUESTS" });
    }
  });
