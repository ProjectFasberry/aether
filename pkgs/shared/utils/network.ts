/**
 * Client address behind our edge.
 *
 * Traefik rewrites `x-real-ip`, so that is the only header we trust first. A
 * raw `x-forwarded-for` chain is client-controlled at the left side; only the
 * last hop (the one our proxy appended) is used as a fallback.
 */
export function clientIp(headers: Record<string, string | undefined>): string {
  const real = headers["x-real-ip"]?.trim();

  if (real) return real;

  const chain = (headers["x-forwarded-for"] ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return chain.at(-1) ?? "unknown";
}

export function normalizeIp(ip: string | undefined | null): string | null {
  if (!ip) return null;

  let trimmedIp = ip.trim().toLowerCase();

  if (trimmedIp === "::1" || trimmedIp === "0:0:0:0:0:0:0:1") {
    return "127.0.0.1";
  }

  if (trimmedIp.startsWith("::ffff:")) {
    trimmedIp = trimmedIp.replace("::ffff:", "");
  }

  const result = trimmedIp.replace(/^\[|\]$/g, "");

  return result || null;
}
