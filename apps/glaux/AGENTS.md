# AGENTS.md - glaux

Panel API and Telegram bot service for Fasberry. Shared monorepo rules are in
the [root AGENTS.md](../../AGENTS.md). Per-module docs are under
[agent-docs/](agent-docs/), listed below.

## Commands

```bash
bun run dev          # infisical /glaux, watch mode
bun run type-check
bun run test
bun run circular-check
bun run release:prod # type-check, then image build/push
```

## Module docs

Per-module behaviour, endpoints and env vars live in `agent-docs/`.
Add `agent-docs/<module>.md` for a new module and list it in the table below.

| module | docs |
| --- | --- |
| `src/modules/webhooks` | [github-webhook.md](agent-docs/github-webhook.md) |
| `src/modules/metrics` | [build-metrics.md](agent-docs/build-metrics.md) |
| `src/modules/service` | - (state route and module wiring) |

## Layout

- `src/modules/` - panel domains and Telegram bot handlers.
- `src/shared/` - env, database clients, NATS, Redis, MinIO, services.
- `src/lib/` - Elysia plugins and helpers.
- `src/lifecycle.ts` - resources and their critical flags.
- Tests: `src/__tests__/`, `src/app.test.ts`.

## Environment and types

- The container entrypoint runs `infisical run --env "$STAGE" --path /glaux`.
  The local `start:prod` script reads `/backend`; do not copy that path into
  deployment config.
- Types come from `pkgs/shared/.out` (`@gen/db/general`, `@gen/db/skins`) and are
  generated, never edited: see
  [generate-types](../workers/generate-types/AGENTS.md).

## Deploy

- `bun run release:prod` runs `type-check` first, then builds and pushes the
  image through the Makefile; there is no direct host access from a workstation.
- `.github/workflows/build-glaux.yml` builds `linux/amd64` on push to `main`
  (prod) and `dev` (staging) into `registry.fasberry.fun/<stage>/glaux`.
- The Dockerfile pins `INFISICAL_VERSION` and verifies the downloaded CLI with
  SHA-256, same as thunderbird.
