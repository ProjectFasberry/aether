# generate-types

`bun run gen:types:db` introspects a live database with `kysely-codegen` and
writes `pkgs/shared/.out/db/<name>/index.ts` (git-ignored, regenerate locally).

**Generate `bisquite` from production-like data.** The dev MariaDB runs with
`lower_case_table_names=1`, so its tables are named `players`, `cmi_users`, ...
while the prod server keeps the original names (`Players`, `ADAPT_DATA`). Code
that queries `Players` therefore type-checks only against a dump generated from
a server with `lower_case_table_names=0`, and a dev dump also lacks tables that
plugins create on first start (for example `ADAPT_DATA` from Adapt).

If the two differ, the symptom is a `tsc` error such as
`Argument of type '"ADAPT_DATA"' is not assignable to ...` while the endpoint
works fine in production.
