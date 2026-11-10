# Data and errors

## Response envelopes

- Success: `{ data: ... }` (`withData`); error: `{ error: "<CODE>" }`
  (`withError`).
- Lists add `meta` with `hasNextPage`, `hasPrevPage`, `startCursor`, `endCursor`
  (`withMeta`). Pagination input is `asc`, `startCursor`, `endCursor`, `limit`
  (max 64, default 32) through `metaSchema`.

## Error codes

- Codes are SCREAMING_SNAKE: `UNAUTHORIZED`, `PERMISSION_DENIED`,
  `DB_UNAVAILABLE`, ...
- Use `status(code, "CODE")` for expected failures. The global handler keeps a
  message that matches `^[A-Z][A-Z0-9_]*$` and replaces anything else with
  `INTERNAL_SERVER_ERROR`, so never put details into a thrown message.
- `VALIDATION` errors return the parsed validation details under `error`.
- `wrapError` keeps a code, parses a JSON message, and otherwise returns a generic
  error object.

## Database and TypeScript shapes

- Columns and Kysely types stay `snake_case`; there is no ORM mapping to camelCase.
  API schemas (`t.Object`) use the same names.
- Timestamps are `timestamptz`; generated types expose them as strings. Convert at
  the edge (`dayjs`) and use `Date` only where the response schema declares it.
- Flexible payloads (prices, effects, metadata, webhook bodies) are `jsonb`.
- IDs are integers from identity columns; public opaque ids (for example a session
  id) are derived hash strings.

## Contracts

- Every route declares `body`, `response` and `detail.summary`; OpenAPI is the
  contract (`/openapi/json`) and `api-contracts` generates clients from it.
- Add fields as optional; do not repurpose existing names.
