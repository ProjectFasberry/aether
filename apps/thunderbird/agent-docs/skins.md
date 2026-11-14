# Skins

Player skin selection, upload and head rendering. The design review and the
target architecture live in the Plane page "Skins system"; this file records how
the current code behaves.

## Routes

| Route | Auth | Behaviour |
| --- | --- | --- |
| `GET /server/skin/history/:nickname` | no | Cached history; warms the cache on a miss or when the entry is older than an hour. |
| `PUT /server/skin/current` | yes | Body `{ skinName }`; writes `sr_players` and rebuilds the cache. |
| `GET /server/skin/set?id=` | yes | Deprecated alias of the PUT, kept for one release. |
| `POST /server/skin/upload` | yes | MineSkin job, then assets, player row and history in one transaction. |
| `GET /server/skin/download/:nickname` | no | 302 to the skin texture URL; falls back to the default skin. |

## Cache

- Key `cache:internal:players:skins:v2:<lowercase nickname>`.
- Envelope `{ updatedAt, data }`; arrays are still parsed for old entries.
- TTL 24 hours, background refresh after one hour, `SET NX PX` lock around a
  rebuild. A caller that loses the lock reads the database directly.
- Redis failures degrade to a database read instead of failing the request.
- `setSkin` and upload invalidate the key before rebuilding, so a failed rebuild
  never serves the previous skin.

The old `players:skins:<nickname>` keys have no TTL and are no longer read; purge
them once with `SCAN`/`DEL` after the rollout.

## Selection and variants

`setSkin` resolves the variant from `sr_url_skins.skin_variant` joined on
`signature`. When one texture has rows with different variants, the player's
current variant wins if it is one of them, otherwise the first non-null value in
alphabetical order. The chosen variant is written to `sr_players.skin_variant`
and returned by the history resolver, so Yggdrasil can emit
`metadata.model = slim`.

Upload keeps the variant on duplicate player rows too; the old upsert dropped it.

## Selection modes

`SKINS_APPLY_MODE` decides who writes the player row:

- `db` (default) - the API validates ownership and writes `sr_players` itself.
- `command` - the API sends `skinsApply` over the command bridge to the backend
  hosting the player. The `nats-spigot` plugin resolves the skin with
  SkinsRestorer, stores the identifier, applies it to the live player and
  publishes `events.skins.changed`. A missing plugin, no responders or a
  timeout returns `503 SERVER_OFFLINE`.

The plugin needs SkinsRestorer 15 (compile dependency `15.4.0`) and
`softdepend: [SkinsRestorer]`. Rollout order: deploy the plugin to every backend
first, then flip the env flag.

## Upload

- The bytes are validated, not the client MIME type: PNG signature plus
  64x64/64x32 dimensions. A bad file returns `400 INVALID_SKIN_FILE` before a
  MineSkin job is queued.
- Per-account limits in Redis: 5 uploads per 24 hours and one per 30 seconds.
  Over the limit returns `429 RATE_LIMITED`.
- Capes are out of scope for v1; `capeUuid` was removed from the request.

## Ownership

`skin_owners(skin_name PK, owner_uuid, is_public, created_at)` and
`skin_audit(id, actor_uuid, target_uuid, action, skin_name, created_at)` live in
`0001_skins_ownership.sql`, applied by hand after the introspected baseline.

- A selection is allowed when `owner_uuid` matches the player or `is_public` is
  set. Before the backfill, a name that embeds the player's nickname
  (`sr-<nickname>-...`) is accepted, so existing uploads keep working.
- Uploads insert the owner row and both upload and selection append an audit
  row. `deleteOldSkins` removes the owner row with the asset; audit rows stay.
- The tables are read with raw SQL so `@gen/db/skins` does not need a
  regeneration before the migration is applied.
- Deploy order: apply the migration first, then the image; otherwise
  selection and upload fail with a missing table.
- `0002_skins_indexes.sql` adds prefix indexes on the TEXT `signature` columns,
  creates `skin_schema_version` and records versions 1 and 2. Boot checks the
  version (`skins-schema` lifecycle step) and fails fast when the schema is old.

Backfill (dry run by default):

```bash
infisical run --env=dev --path=/thunderbird -- bun run scripts/backfill-skin-owners.ts
infisical run --env=dev --path=/thunderbird -- bun run scripts/backfill-skin-owners.ts --apply
```

## History and cleanup

`GET /server/skin/history/:nickname` accepts `?cursor=<offset>&limit=<1..100>`
(default 50) and returns the next offset in the `x-next-cursor` header.

`_loadHistoryFromDB` pins the current skin first and orders the rest by the real
`sr_player_history` timestamp; there is no synthetic `10000000` value. Default
skins use the UUID for the head, and the server-wide `default` row uses the
static fallback head.

`deleteOldSkins` keeps the last two history entries, deletes only `sr_url_skins`
rows whose signature is no longer referenced by any custom skin, and removes
MinIO objects after the transaction commits.

## Metrics

Structured `skins.metric` log lines feed Loki/Grafana: `head_render_ms`,
`head_cache_hit`, `cache_rebuild_ms` and `mineskin_error`. Dashboards and alerts
are still to be wired; the old path had no metrics at all.

## Heads

- Object key `heads-<sha256>.png`, hashed from the signed texture value, so the
  same texture is rendered once regardless of nickname or upload.
- `_performHead` stats the object first and renders only missing heads.
- Texture fetches are bounded to 5 seconds and restricted to `SKIN_DOMAINS`
  (default `textures.minecraft.net`); a bad host fails the entry, not the read.
- The old nickname-based keys are no longer written or read. Cache v4 rebuilds
  every entry; the old objects stay in the bucket until a manual cleanup.

## Registration

`initSkin` runs after the account transaction commits and is not awaited:
registration succeeds while the skins database or MinIO is unavailable.
