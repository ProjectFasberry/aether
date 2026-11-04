# Maintaining aether

The code explains itself. This file is the short list of things that are easy to
get wrong.

## Tooling

- **Bun only.** `bun install`, `bun dev`, `bun run ...`; the lockfile is `bun.lock`.
  `npm`, `yarn` and `pnpm` would produce a second lockfile - don't.
- `bun <script>` is not a single app: `scripts/run.ts` finds every workspace whose
  `package.json` has that script and runs them concurrently. For one app, `cd`
  into it first.
- Cross-package imports are declared as `workspace:*` dependencies (`@repo/core`,
  `@repo/shared`), never as `../../` paths.

## Config and secrets

- Every environment variable is required. `apps/thunderbird/src/shared/env` is a
  zod schema validated at boot: a missing value exits the process instead of
  failing at the first request that needs it.
- Secrets live in Infisical (`/thunderbird` path, `prod` / `staging` envs).
  `infisical run` wraps both the dev command and the container entrypoint; there
  is no `.env` fallback and nothing secret is committed.
- Private packages (`@projectfasberry/*`) need `NODE_AUTH_TOKEN`. Docker builds
  take it as a BuildKit secret (`npm_token`), never as `ARG` or `ENV`, otherwise
  the token ends up baked into an image layer.

## Types and checks

- Database types in `pkgs/shared/.out` are **generated**, not committed
  (`bun gen:types:db`). Type-check fails in confusing ways until they exist.
- `bun lint` (Biome), `bun type-check` (`tsc --build`), `bun circular-check`
  (`dpdm`). Lefthook runs them on commit; the hooks call `node`, so on a machine
  without Node a commit needs `git -c core.hooksPath=/dev/null`.

## Build and deploy

- Apps build through `Bun.build` in their `scripts/build.ts`: staging keeps
  sourcemaps and does not minify, prod minifies **and keeps sourcemaps** - they
  are what makes production stack traces readable.
- Images are per app: `Dockerfile` + `Makefile` (`make build STAGE=prod
  NAME=thunderbird`); the npm token comes from `NODE_AUTH_TOKEN` as a BuildKit
  secret. Normal deploys are built by `.github/workflows/build-thunderbird.yml`
  and pulled by the host on a cron timer (`scripts/deploy/pull-update.sh`).
  There is no manual deploy script and no direct host access.
- Absolute URLs must use `x-forwarded-proto`: Traefik terminates TLS and the app
  only ever sees plain HTTP.

## API surface

- The OpenAPI document is live at `/openapi/json`. Route annotations are the
  source of truth; the `api-contracts` repository generates Bruno collections
  from it, so a route without proper `detail`/schemas is an undocumented route.
