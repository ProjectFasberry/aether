/**
 * Client address behind our edge, shared by every module.
 *
 * Traefik rewrites `x-real-ip`, so that is the only header we trust first. A raw
 * `x-forwarded-for` chain is client-controlled at the left side; only the last
 * hop (the one our proxy appended) is used as a fallback.
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
