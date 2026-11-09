Panel API service for the Fasberry platform. 
Responsible for management and admin workflows, dashboard integrations, and Telegram bot notification services.

## Core Stack & Key Libraries

- **Framework**: `elysia` (High-performance bun-native web framework)
- **Telegram Bot**: `gramio` (Modern Telegram Bot API framework)
- **Database**: `kysely` (Type-safe SQL query builder) + `mysql2`/`pg`
- **Messaging**: `@nats-io/nats-core` + `@nats-io/jetstream` (NATS client & JetStream queues)
- **Caching**: `ioredis` (Redis cache connection)
- **Storage**: `minio` (S3 storage integration)
- **Validation**: `@sinclair/typebox` + `typebox` (Runtime validation and OpenAPI generation)

## GitHub webhook

`POST /webhooks/github` receives push events from the `ProjectFasberry` organization
webhook. It verifies `X-Hub-Signature-256` with `GITHUB_WEBHOOK_SECRET`, deduplicates
`X-GitHub-Delivery` in Redis for 24 hours, and forwards pushes to `main`/`dev` to
the infrastructure Telegram chat and Gotify. Notifications are best-effort and never
block the HTTP response. `GITHUB_REPOS` limits the fan-out to a comma-separated
repository allowlist; `GITHUB_TG_TARGET` overrides the Telegram chat (default
`g_infra`).

Set the webhook URL to `https://panel.fasberry.fun/webhooks/github`, content type
`application/json`, the same secret, and the `push` event only. The secret lives in
Infisical under `/glaux`.
