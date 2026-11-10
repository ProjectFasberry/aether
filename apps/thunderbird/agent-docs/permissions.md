# Permissions

Files: catalog in `src/shared/constants/permissions.ts`, guard in
`src/lib/validators.ts`, cache in `src/shared/services/permission-cache.ts`,
panel routes in `src/modules/private/{permissions,roles}`.

## Catalog

- `PERMISSION_NAMES` is the source of truth. Boot upserts every name into the
  `permissions` table (`INSERT ... ON CONFLICT DO NOTHING`) and fails the critical
  `shared` resource when a declared name still has no row, so do not insert
  permission rows by hand.
- Add a permission by adding the name to the catalog and using the literal in the
  route. `validatePermission` takes `Permission`, so a typo is a `tsc` error.
- Rows that exist in the database but not in the catalog are logged at `debug`
  and stay available to the game servers through `getList()`.

## Guard

- `validatePermission(permission, { withExternal })` requires a session by
  default: it resolves the player role, checks the effective permission set and
  returns `{ as: "internal", role, nickname, permission }`.
- `withExternal: true` accepts `Authorization: Bearer <api key>` for internal
  calls that have no session (API keys, releases, options, users).
- Denials: `400 PERMISSION_DENIED` for a known user without the permission,
  `401 UNAUTHORIZED` without a session or with an invalid key.
- The returned `permission` is the value written to `admin_activity_log` and
  published on NATS by panel routes.

## Effective permissions

- `getPermissions(nickname, roleId)` unions role grants with per-player grants and
  returns a `Set`.
- The result is cached for 15 s per `nickname:roleId`; role-permission and player
  role changes clear the cache. Changes made on another instance are visible after
  the TTL.

## Roles

- `roles.is_admin` marks staff roles. It ships with
  `0026_roles_is_admin.sql`; until that migration is applied the boot probe falls
  back to `role_id = 3` with a warning, so the code and the migration can be
  deployed in any order.
- The permission tree is published to game servers through the
  `subscribeConfig` NATS subscriber (`permissionsService.getList()`).
