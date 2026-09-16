Core API service for the Fasberry platform. 
Responsible for backend logic, storage management, database connections, Minecraft server interactions, and core system integrations.

## Core Stack & Key Libraries

- **Framework**: `elysia` (High-performance bun-native web framework)
- **Database**: `kysely` (Type-safe SQL query builder) + `mysql2`/`pg`
- **Caching**: `ioredis` (Redis client)
- **Messaging**: `@nats-io/nats-core` + `@nats-io/jetstream` (NATS message broker)
- **Storage**: `minio` (S3 object storage helper)
- **Validation**: `zod` + `@sinclair/typebox` (Schema declaration and type verification)
- **Auth & Crypto**: `bcryptjs` + `@oslojs/crypto` + `@oslojs/encoding` (Secure password hashing and encoding utilities)
- **Image Generation**: `@napi-rs/canvas` (High-performance canvas rendering)
