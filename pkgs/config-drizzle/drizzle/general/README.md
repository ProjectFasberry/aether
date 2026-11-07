# General database migrations

`0000_slim_vance_astro` is the only migration registered in the Drizzle
journal. `0001`-`0019` are plain SQL files from the project history and are
applied manually, in numeric order.

## Fresh environment

1. Apply the Drizzle baseline (`bun run db:migrate` or the `0000` snapshot).
2. Apply every later file in order:

```bash
for file in $(ls [0-9][0-9][0-9][0-9]_*.sql | sort); do
  psql "$GENERAL_POSTGRES_URI" -v ON_ERROR_STOP=1 -f "$file"
done
```

## Existing production

Production already has `0001`-`0019`. Do not run the whole loop blindly:
`ALTER TABLE ... ADD COLUMN` without `IF NOT EXISTS` will fail. Apply only the
new file by name.

## Adding a migration

- Keep the numeric prefix and a short English description.
- Prefer `IF NOT EXISTS` / `CREATE ... IF NOT EXISTS` so a retry is safe.
- Add the matching table/column to `schema.ts`; generated types in
  `pkgs/shared/.out` are refreshed separately.
- Never edit an applied file; add the next number instead.
