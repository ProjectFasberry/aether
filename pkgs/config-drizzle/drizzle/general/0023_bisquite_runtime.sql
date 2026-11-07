-- Bisquite runs Purpur 1.20.1; the launcher must build a 1.20.1 client for it.
-- Lobby stays on 1.20.4 and reaches the 1.19.4 backend through ViaVersion.

UPDATE "servers"
SET
  "client_version" = '1.20.1',
  "loader" = 'fabric',
  "loader_version" = '0.16.14',
  "java_major" = 17,
  "client_mod" = 'required'
WHERE "origin" = 'bisquite';
