# Site content

Files: `src/modules/site` (public reads, access), `src/modules/private/content`
(admin draft/publish), table `site_content`, catalog names `content.*`.

The landing keeps its copy in its own translations and asks the API only for the
fields an editor changed. `site_content` therefore holds an override document
per `(page, locale)`, not a full copy:

| column | meaning |
| --- | --- |
| `draft` | latest editor changes; read by the panel and the live preview |
| `published` | what `GET /site/content/*` serves |
| `version` | increments on every write; the editor sends the version it loaded |

## Pages

| page | shape |
| --- | --- |
| `home` | `{ carousel?: [{ image, alt? }], sections? }` |
| `servers` | `{ title?, description?, items?: { [serverOrigin]: { name?, tagline?, description?, image?, icon?, features? } }, sections? }` |
| `start`, `support`, `modpack` | `{ sections? }` |

`sections` is the shared ordered list of extra blocks
`{ id, title, body, hidden? }`: the site renders non-hidden sections at the end of
the page, the panel edits all of them.

`blocks` overrides the built-in sections by their stable id
(`hero`, `news`, `support-faq`, ...): `{ title?, description?, hidden? }`. The
site keeps its translated copy as the fallback, so an empty field means "use the
default"; `hidden` removes the section from the public page.

`image`/`icon` are keys inside the `static` bucket (`images/offenburg-1.webp`),
resolved by the site through `VITE_VOLUME_URL`. Missing fields fall back to the
site defaults, so an empty document renders the current page.

## Routes

Public:

- `GET /site/content/:page?locale=ru` - published document, `{ content, version, updatedAt }`.
- `GET /site/content/:page?locale=ru&draft=1` - the draft for editors, falls back to
  published; the session cookie is checked against `content.update` (`403` otherwise,
  `Cache-Control: no-store`).
- `GET /site/content?pages=home,servers&locale=ru` - batch for SSR.
- `GET /site/access` - cookie-forwarded `{ nickname, canEdit, canPublish }`.

Private (session + permission):

- `GET /privated/content/:page?locale=ru` - `content.read`;
- `PUT /privated/content/:page/:locale` - `content.update`, body `{ version, content }`;
- `POST /privated/content/:page/:locale/publish` - `content.publish`, body `{ version }`;
- `POST /privated/content/:page/:locale/discard` - `content.publish`, body `{ version }`.

Writes are optimistic: a stale `version` answers `409 VERSION_CONFLICT`, invalid
page content answers `400 CONTENT_INVALID`, an unknown page answers `404`.

The migration `0036_site_content.sql` creates the table and grants `content.*` to
admin roles; the permission rows themselves also come from the code catalog on
boot. The Kysely types in `pkgs/shared/.out` predate the table, so the module uses
tagged SQL - regenerate them before switching to the typed builder.
