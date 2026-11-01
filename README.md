# aether

The Fasberry HTTP API: launcher and web auth, accounts, server content and
manifest, live server status, and game releases.

[![License](https://img.shields.io/github/license/ProjectFasberry/aether?style=for-the-badge)](./LICENSE)
![Issues](https://img.shields.io/github/issues-raw/ProjectFasberry/aether?color=c78aff&label=issues&style=for-the-badge)
![Pull Requests](https://img.shields.io/github/issues-pr-raw/ProjectFasberry/aether?color=c78aff&label=PRs&style=for-the-badge)
![Last Commit](https://img.shields.io/github/last-commit/ProjectFasberry/aether?color=c78aff&label=last%20commit&style=for-the-badge)

---

## Running it

```bash
bun install
bun start          # or: bun dev
```

Everything the API needs comes from the environment only; there are no local
defaults and no `.env` fallbacks.

## Things that will bite you

- **Config is validated at boot.** `apps/thunderbird/src/shared/env/index.ts` is
  the full schema: a missing or malformed variable exits the process instead of
  failing at the first request.
- **Secrets come from Infisical** (`/thunderbird` path, `prod`/`staging` envs).
  The container logs in at start and runs the app under `infisical run`.
- **Database types are generated, not committed** (`bun gen:types:db` →
  `pkgs/shared/.out/db/*`). Most checks fail confusingly until they exist.
- **Private npm packages** (`@projectfasberry/*`) need `NODE_AUTH_TOKEN`. Docker
  builds take it as a BuildKit secret (`npm_token`); never as `ARG`/`ENV`.
- **Absolute URLs use `x-forwarded-proto`** - Traefik terminates TLS, the app
  itself sees plain HTTP.
- **The OpenAPI document is live** at `/openapi/json`; the `api-contracts` repo
  syncs Bruno collections from it, so the annotations in route definitions are
  the source of truth, not a hand-written spec.

## License

Distributed under the GPL-3.0 License. See [LICENSE](./LICENSE) for details.
