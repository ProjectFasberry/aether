# AGENTS.md - generate-types

Introspects a live database with `kysely-codegen` and writes
`pkgs/shared/.out/db/<name>/index.ts`, which is what `@gen/db/*` resolves to.

- `.out` is git-ignored: never edit it by hand, regenerate it.
- Docker builds do not type-check, so a stale `.out` will not fail CI. Run
  `bun run type-check` after regenerating to catch code that still references
  dropped tables or columns.

## Interactive

```bash
bun run gen:types:db   # repo root; prompts for environment and database
```

Requires `apps/workers/generate-types/.env.infisical` with
`INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `INFISICAL_PROJECT_ID` and
`INFISICAL_API_URL`. Secrets are fetched from the `/shared` path through the
Infisical SDK.

## Non-interactive

```bash
infisical run --env=prod --path=/shared -- \
  bun run apps/workers/generate-types/src/index.ts \
  --type=db --no-interactive --env=prod --scoped --host=192.168.1.103
```

| flag | meaning |
| --- | --- |
| `--no-interactive` | no prompts, no SDK: URLs are read from `process.env` |
| `--env=dev\|prod` | required with `--no-interactive` |
| `--scoped` | every declared database |
| `--target=<name>` | one database instead of `--scoped` |
| `--host=<host>` | rewrites the URL host |
| `--type=db` | only supported type |

`bun run db:ci` is the same entry point without `--env-file`.

## Databases

Secret name: `<NAME>_<DIALECT>_URI`, uppercase.

| name | dialect |
| --- | --- |
| general, payments, luckperms, libertybans | postgres |
| skins, bisquite, lobby, plan, playerpoints, reputation | mysql |

## Nuances

- `--scoped` and `--target=<name>` are mutually exclusive.
- Prod URIs point at `127.0.0.1`; pass `--host=192.168.1.103` (any address that
  reaches the deploy host) to run from a workstation.
- Use `--path=/shared` for non-interactive runs: `/thunderbird` has no
  `PAYMENTS_POSTGRES_URI`.
- Missing secret: `--scoped` logs `Skip "<name>"` and continues; an explicit
  `--target=<name>` fails with exit code 1. A failed `kysely-codegen` (or a
  database that does not answer within 120 s) also sets exit code 1, and so does
  a run that generated nothing.
- `payments` is a separate database on the same Postgres host as `general`.

## bisquite

Generate `bisquite` from production-like data. The dev MariaDB runs with
`lower_case_table_names=1`, so its tables are named `players`, `cmi_users`, ...
while the prod server keeps the original names (`Players`, `ADAPT_DATA`). Code
that queries `Players` therefore type-checks only against a dump generated from
a server with `lower_case_table_names=0`, and a dev dump also lacks tables that
plugins create on first start (for example `ADAPT_DATA` from Adapt).

If the two differ, the symptom is a `tsc` error such as
`Argument of type '"ADAPT_DATA"' is not assignable to ...` while the endpoint
works fine in production.
