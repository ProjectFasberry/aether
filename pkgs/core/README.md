# @repo/core

Shared core domain module library in the Fasberry monorepo. It centralizes reusable backend domain logic, third-party adapters (like MinIO, RCON, API), and business modules.

## Main Domain Modules & Adaptors

- **`player`**: Player profiles, database mappings, and core gameplay metadata handler.
- **`skins`**: Player skins rendering and management.
- **`status`**: Minecraft server health and connection states.
- **`lib/minio`**: Reusable S3-compatible file storage wrapper.
- **`lib/rcon`**: Centralized RCON manager for Minecraft servers.

## Core Libraries Used

- **Web Context**: `elysia` (Context/plugin sharing)
- **Database**: `kysely` + `kysely-mariadb` (Type-safe SQL querying)
- **Messaging**: `@nats-io/nats-core` + `@nats-io/jetstream`
- **Image Generation**: `@napi-rs/canvas`
- **Storage & Helpers**: `minio`, `modern-rcon`, `ioredis`, `zod`, `ky`
