# Yggdrasil (game auth)

Module: `src/modules/yggdrasil` (`profile`, `token`, `textures`,
`signing-keys`, rate limiting).

- `/yggdrasil/*` is our Minecraft auth server. The proxy runs `online-mode = true`
  with `authlib-injector`, so game clients authenticate against this API.
- Signing keys are ensured at boot by the critical `signing-keys` resource
  (`signing-keys.model.ts`); a failure stops the boot.
- Textures and profiles are served from MinIO-backed storage.
- Requests are rate limited per endpoint; the limits live in
  `rate-limit.model.ts`.
- Design and migration progress log:
  [`docs/auth/auth-migration.md`](../../../../docs/auth/auth-migration.md) in the
  workspace parent.
