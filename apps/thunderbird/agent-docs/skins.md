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

## Heads

`_loadHistoryFromDB` awaits `_performHead`, and `_performHead` awaits every
`putObject`, so a head exists when the history response is returned. A failed
render is logged and does not fail the history read; the next rebuild retries.
Rendering is still nickname-scoped and repeated per rebuild - the content
addressed outbox is the Phase 2 target.

## Registration

`initSkin` runs after the account transaction commits and is not awaited:
registration succeeds while the skins database or MinIO is unavailable.
