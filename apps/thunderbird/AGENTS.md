# AGENTS.md - thunderbird

Core Fasberry API: public and game-facing endpoints. Shared monorepo rules are
in the [root AGENTS.md](../../AGENTS.md).

## Commands

```bash
bun run dev          # infisical /thunderbird, watch mode
bun run type-check
bun run test
bun run circular-check
bun run release:prod # type-check, then image build/push
```

## Module docs

Per-module behaviour, endpoints and env vars live in `agent-docs/`.
Add `agent-docs/<module>.md` for a new module and list it below.

| area | modules | docs |
| --- | --- | --- |
| Auth, sessions, API keys | `src/modules/{auth,account,launcher}` | [auth.md](agent-docs/auth.md) |
| Game auth | `src/modules/yggdrasil` | [yggdrasil.md](agent-docs/yggdrasil.md) |
| Access control | `src/shared/constants/permissions.ts`, `src/lib/validators.ts` | [permissions.md](agent-docs/permissions.md) |
| Store and orders | `src/modules/{store,payments}` | - |
| Economy | `src/modules/{economy,referrals}` | - |
| Servers | `src/modules/{server,server-ip}` | - |
| Content | `src/modules/{news,wiki,rules,banner,modpack,releases,content}` | - |
| Players | `src/modules/{user,avatars,fact,misc}` | - |
| Private panel | `src/modules/private/*` | - |

## Layout

- `src/modules/` - domain routes and models: `auth`, `yggdrasil`, `account`,
  `launcher`, `releases`, `user`, `server`, `news`, `modpack`, `store`,
  `private/*`, etc.
- `src/shared/` - `env`, database clients, NATS, Redis, MinIO, services,
  constants.
- `src/lib/` - Elysia plugins, guards, permission helpers.

## Database and types

- Clients live in `src/shared/database/`: `general`, `luckperms`, `libertybans`
  (postgres), `skins`, `lobby`, `plan`, `playerpoints`, `reputation` (mysql) and
  `bisquite` (mariadb).
- Types come from `pkgs/shared/.out` (`@gen/db/*`) and are generated, never
  edited: see
  [generate-types](../workers/generate-types/AGENTS.md).
- `tsc` fails in confusing ways when `.out` is stale. A known symptom is
  `ADAPT_DATA` in `src/modules/server/player/player.model.ts`; regenerate instead
  of patching the query.
- Boot lifecycle is `src/lifecycle.ts`. `db` is critical and all-or-none: one
  unavailable required database stops boot. `jobs` and `minio` are optional and
  degrade.

## Migrations

- Plain SQL in `pkgs/config-drizzle/drizzle/<db>/`. Only `0000` is registered in
  the Drizzle journal; `0001+` are applied by hand, in numeric order, and should
  stay additive (`IF NOT EXISTS`). Details:
  [general README](../../pkgs/config-drizzle/drizzle/general/README.md).
- After a schema change regenerate `pkgs/shared/.out` and run `type-check`.

## Deploy

- `.github/workflows/build-thunderbird.yml` builds `linux/amd64` on push to
  `main` (prod) and `dev` (staging) and pushes
  `registry.fasberry.fun/<stage>/thunderbird:latest` plus `:sha-<commit>`.
  Repo secrets: `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`, `NODE_AUTH_TOKEN`.
- The Dockerfile pins `INFISICAL_VERSION` and downloads the CLI from the GitHub
  release with SHA-256 verification; the apt repository on
  `artifacts-cli.infisical.com` hangs behind the deploy network. Bump it with
  `--build-arg INFISICAL_VERSION=<version>`.
- Verify from outside: `https://api.fasberry.fun/server/status` (200) and
  `/openapi/json` when the contract changed.
