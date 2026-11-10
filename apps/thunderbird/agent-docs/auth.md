# Auth and sessions

Modules: `src/modules/auth` (login, registration, sessions, QR login),
`src/modules/account` (password change, account removal),
`src/modules/launcher` (launcher join).

## Accounts

- Canonical tables: `accounts` + `account_credentials`. The legacy `AUTH` table
  was dropped (`0002_drop_auth.sql`) and nothing references it.
- Registration is nickname + password + findout only. The seed phrase/mnemonic
  was removed from the client and the API (`registerSchema` has no `hash`);
  recovery is handled by an admin until 2FA and email/Telegram are added. Do not
  reintroduce `hash` or restore the old routes.

## Sessions

- Web sessions live in Redis under `session:{token}` with a sliding TTL: a
  request refreshes the token and the per-user session list when the remaining
  TTL drops below the refresh threshold, and the absolute age is capped at 90
  days.
- The token is stored in the `SESSION_KEY` cookie; the launcher has no cookie jar
  and sends `Authorization: Bearer <token>` instead.
- The global derive in `src/app.ts` reads the payload and TTL in one Redis
  round-trip and caches `token -> nickname` for the rest of the request, so route
  guards do not read the session again.
- Session list and revocation: `session.route.ts`; logout/invalidation:
  `invalidate.route.ts`.

## API keys

- `api_keys` stores the SHA-256 of the key plus an optional duration; a null
  duration is a legacy key without expiry.
- `handleByBearer` caches the result for 30 s (5 s for rejected keys), so a burst
  of requests with the same key does not hash and query every time.

## QR login

- QR sessions are published on the `auth:qr:` Redis channel. When
  `notify-keyspace-events` is unset the service falls back to WebSocket timers
  and logs a warning; this is expected, not an outage.

## Login events

- Successful logins publish `EVENTS.AUTHORIZATION.LOGIN` on NATS. Publishing is
  best-effort: a NATS hiccup must not fail the login.

## Bot protection

- CAP tokens are single-use: a stale token makes the CAP server answer 4xx.
- Never throw `status()` inside a `try/catch` in `botValidator`:
  `ElysiaCustomStatusResponse` inherits `Error`, and the catch turns a 400 into a
  500.
