# GitHub webhook

Module: `src/modules/webhooks/github.ts` (tests: `github.test.ts`), mounted by
`src/modules/service/index.ts`.

`POST /webhooks/github` receives push events from the `ProjectFasberry`
organization webhook. It verifies `X-Hub-Signature-256` with
`GITHUB_WEBHOOK_SECRET`, deduplicates `X-GitHub-Delivery` in Redis for 24 hours,
and forwards pushes to `main`/`dev` to the infrastructure Telegram chat and
Gotify. Notifications are best-effort and never block the HTTP response.

## Configuration

| variable | purpose |
| --- | --- |
| `GITHUB_WEBHOOK_SECRET` | HMAC secret for `X-Hub-Signature-256` |
| `GITHUB_REPOS` | comma-separated repository allowlist for fan-out |
| `GITHUB_TG_TARGET` | Telegram chat override, default `g_infra` |

Secrets live in Infisical under `/glaux`.

## Webhook setup

- URL: `https://panel.fasberry.fun/webhooks/github`
- Content type: `application/json`
- Secret: the same `GITHUB_WEBHOOK_SECRET`
- Events: `push` only
