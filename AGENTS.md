# AGENTS.md - working in aether

Bun monorepo with the Fasberry backend services. Shared rules, layout and the
deploy model live here; each service keeps its own details:

| path | doc |
| --- | --- |
| `apps/thunderbird` - public + game API | [AGENTS.md](apps/thunderbird/AGENTS.md), [modules](apps/thunderbird/agent-docs/) |
| `apps/glaux` - panel/bot API | [AGENTS.md](apps/glaux/AGENTS.md), [modules](apps/glaux/agent-docs/) |
| `apps/workers/generate-types` - DB types | [AGENTS.md](apps/workers/generate-types/AGENTS.md) |
| `pkgs/config-drizzle/drizzle/general` - migrations | [README.md](pkgs/config-drizzle/drizzle/general/README.md) |
| `agent-docs/` - triage and API conventions | [incident-triage.md](agent-docs/incident-triage.md), [data-and-errors.md](agent-docs/data-and-errors.md) |

## Hard rules

- **Never commit or push without an explicit request.** Ask first, including for
  local commits.
- **Bun only.** `bun install`, `bun run ...`. Never create a second lockfile
  (`npm`, `pnpm`, `yarn` are forbidden); the lockfile is `bun.lock`.
- **Secrets stay out of the repo and images.** Runtime secrets come from
  Infisical (`/thunderbird`, `/glaux`; database URLs are also under `/shared`;
  envs `dev`/`staging`/`prod`). The `NODE_AUTH_TOKEN` for private
  `@projectfasberry/*` packages lives in the gitignored `.env` and goes into
  Docker builds only as the BuildKit secret `npm_token`, never as `ARG`/`ENV`.
- **Deploy only on an explicit request.** Production is not a place for
  "while I was here" changes.
- **No direct host access.** Do not ssh/scp/docker against deploy or production
  hosts; ship through CI and the pull-based rollout.
- **Do not edit generated files.** DB types in `pkgs/shared/.out` and the `dist`
  build output are generated.

## Layout

- `apps/thunderbird/` - public and game API; routes and models under
  `src/modules`, infrastructure under `src/shared`, Elysia plugins and guards
  under `src/lib`.
- `apps/glaux/` - panel API and Telegram bot service; same layout as thunderbird.
- `apps/workers/generate-types/` - `kysely-codegen` runner for
  `pkgs/shared/.out`.
- `pkgs/shared/schemas/*` - zod schemas used by both routes and clients.
- `pkgs/core` - reusable domain services (lifecycle, database helpers).
- `pkgs/config-drizzle/drizzle/<db>/` - Drizzle schemas and hand-applied SQL
  migrations per database.
- Cross-package imports are `@repo/shared/...`, `@repo/core/...`; inside an app
  use the `#/` alias. Never reach into another workspace with `../../`.

## Commands

```bash
bun install
bun run type-check        # every workspace that has the script
bun run lint              # biome
bun run test
bun run circular-check
bun gen:types:db          # regenerate pkgs/shared/.out (interactive)
```

Root scripts fan out through `scripts/run.ts` to every workspace that defines the
script and exit non-zero if any of them fails. Per-service commands (`dev`,
`release:prod`, ...) are in the app docs.

## Definition of done

| change | add / run |
| --- | --- |
| route or response schema | `body`, `response`, `detail.summary`; `bun run type-check`; compare `/openapi/json`; `scripts/dispatch-contracts.sh` after deploy |
| DB schema | new additive `NNNN_*.sql` under `pkgs/config-drizzle/drizzle/<db>/`; apply by name; regenerate `.out`; `type-check` |
| permission or role | catalog entry in `permissions.ts` plus the literal in the route; boot creates the row |
| shared package (`pkgs/*`) | root `bun run type-check` and `bun run test` |
| worker or CLI | non-interactive run of the affected target |
| anything | `bun run test`, `bun run lint`; update `agent-docs/` when behaviour or env changes |

## Repo-wide gotchas

- `pkgs/shared/.out` and `dist` are generated: never edit them by hand,
  regenerate. `.out` is git-ignored, so a stale copy only shows up in a local
  `type-check`.
- OpenAPI is the contract: `GET /openapi/json`. Route `body`, `response` and
  `detail` are the source of truth; `api-contracts` syncs from the deployed spec.
  A route without them is an undocumented route.
- Env vars are a zod schema validated at boot
  (`apps/thunderbird/src/shared/env`): a new variable must be added there, and a
  missing one exits the process instead of failing on the first request.
- Absolute URLs must use `x-forwarded-proto`: Traefik terminates TLS and the app
  only sees plain HTTP.
- Lefthook hooks call `node`; without Node a commit needs
  `git -c core.hooksPath=/dev/null commit`.

## Issue tracking

Work items live in the team tracker, whichever one is connected through the
available MCP tools; do not hardcode workspace, project or team ids here -
discover them with the tracker tools. Agent-created items get the `AI` label;
API work adds `api`, and anything in this repository adds `thunderbird`. Labels,
states and priorities are per team, so list them before filtering or setting.

## Commits

Conventional commits (`.cz.toml`), short and lowercase, e.g.
`fix: drop the mnemonic hash from register`. Never commit without asking.

## Deploy model

Deploys are pull-based: a push to `main` (prod) or `dev` (staging) builds the
image in GitHub Actions and pushes it to `registry.fasberry.fun/<stage>/<app>`;
the deploy host runs `scripts/pull-update.sh` from `ProjectFasberry/infra` (local
checkout: `../infra-host`) on a two-minute timer and recreates the container only
when the digest changed. There is no manual deploy path from this workstation.
Image names, workflows and health checks are in the per-app docs; first response
steps are in [agent-docs/incident-triage.md](agent-docs/incident-triage.md).
