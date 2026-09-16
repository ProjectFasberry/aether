Panel API service for the Fasberry platform. 
Responsible for management and admin workflows, dashboard integrations, and Telegram bot notification services.

## Core Stack & Key Libraries

- **Framework**: `elysia` (High-performance bun-native web framework)
- **Telegram Bot**: `gramio` (Modern Telegram Bot API framework)
- **Database**: `kysely` (Type-safe SQL query builder) + `mysql2`/`pg`
- **Messaging**: `@nats-io/nats-core` + `@nats-io/jetstream` (NATS client & JetStream queues)
- **Caching**: `ioredis` (Redis cache connection)
- **Storage**: `minio` (S3 storage integration)
- **Validation**: `@sinclair/typebox` + `typebox` (Runtime validation and OpenAPI generation)
