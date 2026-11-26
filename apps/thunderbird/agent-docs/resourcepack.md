# Resource pack versions

Files: `src/modules/content/resourcepack.model.ts` (storage, publishing),
`src/modules/content/manifest.model.ts` (manifest rewrite),
`src/modules/private/resourcepack` (panel routes), `src/modules/server/resourcepack`
(public read), table `resource_packs`, catalog names `resourcepack.*`.

ItemsAdder still generates the pack with `/iazip`, but the archive is uploaded
through the panel instead of being copied to the volume by hand. Each upload is
an immutable version; publishing is a pointer flip plus a manifest rewrite, and
rollback publishes an older version.

## Storage

| key | meaning |
| --- | --- |
| `resourcepack/packs/<sha256>.zip` | immutable archive of one version |
| `resourcepack/resourcepacks/generated.zip` | canonical file the launcher manifest points at |
| `resourcepack/manifest.json` | content manifest, entry rewritten on publish |

`resource_packs` holds `sha1`, `sha256`, `size`, `object_key`, `minecraft`
(target client versions), `pack_format`, `notes`, `uploaded_by`, `is_current`.
A partial unique index keeps exactly one current row.

## Routes

Public:

- `GET /server/resourcepack/meta` - `{ version, sha1, sha256, size, url, stable_url,
  minecraft, pack_format, updated_at }` for the current pack; `url` is the
  immutable versioned object. `404` when nothing is published.
- `GET /server/resourcepack/latest.zip` - `302` to `url` with
  `Cache-Control: no-store`; the redirect target never changes.

Private (session + permission):

- `GET /privated/resourcepack` - `{ current, items }`; `resourcepack.read`.
- `POST /privated/resourcepack` - multipart `file` (zip, <= 100 MB), optional
  `minecraft` (comma-separated, defaults to every known version) and `notes`;
  `resourcepack.publish`. Returns `{ pack, warnings }`; a duplicate SHA-256 is
  `409`, an invalid archive is `400`.
- `POST /privated/resourcepack/:id/current` - publish a version or roll back;
  `resourcepack.publish`.
- `POST /privated/resourcepack/adopt` - register and publish the archive already
  at the canonical path. One-time repair for the hand-uploaded pack.

Publishing writes the archive first, then the manifest, then flips `is_current`,
and finally publishes `general.resourcepack.updated` on NATS.

## Consumers

- Launcher: reads the manifest through `GET /static/manifest`, so it picks the
  new `resourcepacks/generated.zip` hash on the next content sync.
- `NatsIntegration` (compat players): reads `/server/resourcepack/meta` on start,
  every `refresh-seconds` and on `general.resourcepack.updated`; see
  `plugins/docs/compat-pack.md`.
- ItemsAdder: keeps `external-host` on the canonical URL, which the publish step
  overwrites in place, so its config does not change per version.

## Retention

`pruneResourcePacks()` keeps the newest `PACK_RETENTION` versions plus the
current one and deletes the rest (rows first, then objects). It is not scheduled
yet; call it when the list grows.
