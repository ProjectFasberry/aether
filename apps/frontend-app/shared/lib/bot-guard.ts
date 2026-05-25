const BOT_UA_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /slurp/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /axios/i,
] as const;

export function isBotRequest(headers: Record<string, string | undefined>, pathname?: string): boolean {
  const ua = headers['user-agent'] ?? '';
  const accept = headers['accept'] ?? '';
  const referer = headers['referer'] ?? '';

  const isBotUA = BOT_UA_PATTERNS.some((re) => re.test(ua));
  const missingCommonHeaders =
    !ua || !accept || (!referer && !accept.includes('text/html'));

  const result = isBotUA || missingCommonHeaders

  if (result && import.meta.env.DEV) {
    if (pathname) {
      console.warn(`Prevented bot request at ${pathname}`);
    }
  }

  return result
}