# Admin lands

Private land management lives in
`src/modules/private/lands/` and is used by the "Регионы" section of the
panel config page.

## Permissions

- `lands.read` - list and inspect lands.
- `lands.create` - create random or manual lands and list eligible players.
- `lands.delete` - delete a land.

The names are declared in `src/shared/constants/permissions.ts`; boot creates
the rows. The production admin role has all three.

## Routes

| Route | Purpose |
| --- | --- |
| `GET /privated/lands/list?limit&endCursor&searchQuery` | Cursor-paginated list with owner and members. |
| `GET /privated/lands/eligible-players?limit&searchQuery` | Players whose UUID is not a key in any `lands_lands.members`. |
| `POST /privated/lands/random` | Pick an existing land or the built-in template as the area/type/stats source and create a land. |
| `POST /privated/lands/manual` | Same template for `area`, but `name`, `title`, `type`, `level` and `stats` come from the request. |
| `DELETE /privated/lands/:ulid` | Delete a land, its banner/gallery rows; claims cascade. |

## Creation rules

- `players` is a non-empty array of UUIDs. The first player becomes the owner and
  receives `chunks` (default 4); other selected players become members with 0
  chunks.
- Every selected player must exist in `general.players` and must not already be
  a key in any `lands_lands.members`. The check is repeated inside the MariaDB
  transaction, but general players and lands live in different databases, so it
  is still best-effort against a concurrent create.
- The game plugin owns the rest of the land lifecycle. The admin route inserts
  the `lands_lands` row only, exactly like the old create route; it does not
  write `lands_players`.
- On an empty `lands_lands` the route builds a template itself: the latest
  overworld from `lands_worlds` for the first `lands_servers` row, a `LAND` type,
  zero stats and a minimal `area` JSON with a fresh Crockford ULID. This is what
  makes creation work before the first player has ever created a land.

## Notes

- `members` is a JSON object keyed by player UUID, so eligibility is derived from
  the same source the panel reads.
- `getAdminLands` does not use the public `getLands` route: the public one
  returns an empty page when member UUIDs are missing from `general.players`.

## Public lands and owner control

The public routes live in `src/modules/server/lands/`. The owner is the first
key of the `lands_lands.members` JSON object, which is also the order the
plugin writes; the API keeps that order instead of sorting members.

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /server/lands/:ulid` | optional | Land card; `isOwner` is computed from the first member and the session nickname. |
| `GET /server/lands/similar?variant=by-player&target=<nickname>` | no | Lands the player belongs to. The UUID comes from `lands_players` first, then `accounts`. |
| `PATCH /server/lands/:ulid` | owner | `{ title }` - the description shown on the land page, up to 300 characters, `&`/`§` colour codes allowed. |
| `POST /server/lands/:ulid/banner` | owner | Multipart image, stored in the `lands` bucket; the previous object is deleted. |
| `DELETE /server/lands/:ulid/banner` | owner | Removes the row and the object. |
| `POST /server/lands/:ulid/gallery` | owner | Multipart image; up to 12 rows. |
| `DELETE /server/lands/:ulid/gallery` | owner | Body `{ url }` with the stored key; removes the row and the object. |

Images are PNG/JPEG/WebP up to 2 MB. `S3.getClient(BUCKETS.LANDS)` requires the
bucket to be listed in `pkgs/shared/constants/buckets.ts`.
