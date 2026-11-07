# AGENTS.md - working in aether

Bun monorepo with the Fasberry backend services. The main public API is
`apps/thunderbird` (Elysia + Kysely + Redis + NATS + MinIO), the panel API is
`apps/glaux`, and `apps/workers/generate-types` generates DB types. Shared code
lives in `pkgs/*` (`@repo/shared`, `@repo/core`, configs).

Read `standards/MAINTAINING.md` first. This file is the agent-facing summary:
rules, layout, and the deploy path.

## Hard rules

- **Never commit or push without an explicit request.** Ask first, including for
  local commits.
- **Bun only.** `bun install`, `bun run ...`. Never create a second lockfile
  (`npm`, `pnpm`, `yarn` are forbidden); the lockfile is `bun.lock`.
- **Secrets stay out of the repo and images.** Runtime secrets come from
  Infisical (`/thunderbird`, `/glaux`; envs `dev`/`staging`/`prod`). The
  `NODE_AUTH_TOKEN` for private `@projectfasberry/*` packages lives in the
  gitignored `.env` and goes into Docker builds only as the BuildKit secret
  `npm_token`, never as `ARG`/`ENV`.
- **Deploy only on an explicit request.** Production is not a place for
  "while I was here" changes.
- **No direct host access.** Do not ssh/scp/docker against deploy or production
  hosts; ship through CI and the pull-based rollout.
- **Do not edit generated files.** DB types in `pkgs/shared/.out` and the `dist`
  build output are generated.

## Layout

- `apps/thunderbird/src/modules/` - domain routes and models: `auth`, `yggdrasil`,
  `account`, `launcher`, `releases`, `user`, `server`, `news`, `modpack`, `store`,
  `private/*`, etc.
- `apps/thunderbird/src/shared/` - `env`, db clients, NATS, Redis, MinIO,
  services, constants.
- `apps/thunderbird/src/lib/` - Elysia plugins, guards, permissions helpers.
- `pkgs/shared/schemas/*` - zod schemas used by both routes and clients.
- `pkgs/core` - reusable domain services.
- Cross-package imports are `@repo/shared/...`, `@repo/core/...`; inside an app
  use the `#/` alias. Never reach into another workspace with `../../`.

## Commands

```bash
bun install                      # once, root
cd apps/thunderbird && bun run dev       # infisical dev, watch mode
cd apps/thunderbird && bun run type-check
bun run lint                     # biome, root
bun run circular-check           # per app
bun gen:types:db                 # regenerate pkgs/shared/.out (needs DB + .env.infisical)
```

`bun <script>` at the root is not one app: `scripts/run.ts` runs the script in
every workspace that has it. `cd` into the app for a single service.

## Checks and gotchas

- `tsc --build` fails in confusing ways when DB types are missing or stale
  (`pkgs/shared/.out`). A known symptom is `ADAPT_DATA` in
  `apps/thunderbird/src/modules/server/player/player.model.ts`. Run
  `bun gen:types:db`; do not patch the query to silence it.
- Lefthook hooks call `node`. On a machine without Node a commit fails; use
  `git -c core.hooksPath=/dev/null commit ...` only when the user asked for a
  commit.
- OpenAPI is the contract: `GET /openapi/json`. Route `body`, `response` and
  `detail` are the source of truth; `api-contracts` syncs from the deployed spec.
  A route without them is an undocumented route.
- CAP tokens are single-use. Never throw `status()` inside a `try/catch` in
  `botValidator`: `ElysiaCustomStatusResponse` inherits `Error`, and the catch
  turns a 400 into a 500.

## Auth model (2026-11)

- Canonical tables: `accounts` + `account_credentials`. `AUTH` is a legacy
  compatibility dual-write kept until cleanup; do not read it for new code.
- Registration is nickname + password + findout only. The seed phrase/mnemonic
  was removed from the client and the API (`registerSchema` has no `hash`);
  recovery is handled by an admin until 2FA and email/Telegram are added. Do not
  reintroduce `hash` or restore routes.
- Game auth is our Yggdrasil (`/yggdrasil/*`); the proxy runs
  `online-mode = true` with `authlib-injector`. Check `docs/auth-migration.md` in
  the workspace parent for the full design and progress log.

## Deploying thunderbird

There is no direct access to deploy hosts and no manual deploy path from this
workstation: do not ssh/scp/docker against `i-m` or the production host.

Deploys are pull-based:

- `.github/workflows/build-thunderbird.yml` builds `linux/amd64` on push to
  `main` (prod) and `dev` (staging) and pushes
  `registry.fasberry.fun/<stage>/thunderbird:latest` plus `:sha-<commit>`.
  Repo secrets: `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`, `NODE_AUTH_TOKEN`.
- The deploy host runs the pull-update script from the infra repository
  (`ProjectFasberry/infra`, `scripts/pull-update.sh` + its systemd timer) every
  two minutes. It pulls the image and recreates the container only when the
  digest changed, so a push is the whole rollout. This repository carries no host
  scripts.
- The Dockerfile pins `INFISICAL_VERSION` and downloads the CLI from the GitHub
  release with SHA-256 verification; the apt repository on
  `artifacts-cli.infisical.com` hangs behind the deploy network. Bump it with
  `--build-arg INFISICAL_VERSION=<version>`.

Verify from outside: `https://api.fasberry.fun/server/status` (200) and
`/openapi/json` when the contract changed. Host-side changes (Traefik/Zot,
compose files) belong to the infra repo, not to a deploy from this checkout.

`apps/glaux` has its own `Dockerfile` and `Makefile`; check its `release:prod`
script before deploying it. The repo-level `release:prod` scripts run
`type-check` first, which currently fails on the stale DB-types issue above.

## Issue tracking

Work items live in Linear (workspace `modkeep`, team `main`, project Fasberry).
Agent-created issues get the `AI` label; API work adds `api`, and anything in
this app adds `thunderbird`. Labels, priorities and the MCP recipe are in
`standards/linear.md`.

## Commits

Conventional commits (`.cz.toml`), short and lowercase, e.g.
`fix: drop the mnemonic hash from register`. Never commit without asking.

## Infra boundary

Host topology, compose files, Traefik, the registry and the rollout live in
`ProjectFasberry/infra`. This repository builds and publishes images only: no host
names, ports, paths or deploy commands belong here.

