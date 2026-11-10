/**
 * Request-scoped session lookup. The global session derive reads the session
 * payload once; route guards reuse the token -> nickname result instead of
 * hitting Redis again for the same cookie.
 *
 * Entries are keyed by token because one request can carry a cookie session and
 * a different bearer token at the same time.
 */
const nicknamesByRequest = new WeakMap<Request, Map<string, string>>();

export function setRequestNickname(request: Request, token: string, nickname: string): void {
  const cached = nicknamesByRequest.get(request);

  if (cached) {
    cached.set(token, nickname);
    return;
  }

  nicknamesByRequest.set(request, new Map([[token, nickname]]));
}

/** Returns `undefined` when the token was not read for this request yet. */
export function getRequestNickname(request: Request, token: string): string | undefined {
  return nicknamesByRequest.get(request)?.get(token);
}
