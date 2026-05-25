## Overview
The backend provides:
- **REST API** for application frontend services
- **Authentication & Authorization** with session management
- **Database Layer** using Drizzle ORM with SQLite/PostgreSQL support
- **Real-time Communication** via NATS pub/sub
- **Minecraft Integration** with RCON protocol support
- **Cron Jobs** for scheduled tasks
- **File Storage** via MinIO
- **Prometheus Metrics** for monitoring
- **Rate Limiting** and security features
- **OpenAPI/Swagger** documentation

## Tech Stack
- **Runtime**: Bun ≥ 1.3.0
- **Framework**: Elysia 1.4.16
- **Database**: Drizzle ORM 0.44.2 with SQLite/PostgreSQL
- **Message Queue**: NATS 3.2.0 with JetStream
- **Cache**: Redis
- **File Storage**: MinIO
- **Language**: TypeScript
- **Monitoring**: Prometheus

## Infrastructure Setup
The project includes Docker Compose configuration for all supporting services:

```bash
# This starts:
# - PostgreSQL/SQLite database
# - Redis cache
# - NATS message broker
# - MinIO object storage
# - Dragonfly (optional cache layer)
```

## Getting Started
The API will be available at `http://127.0.0.1:4104`

### API Documentation
Once the server is running:
- **OpenAPI Spec**: `http://127.0.0.1:4104/openapi/json`

Auto-generated from Elysia definitions using `@elysiajs/openapi`.

### Prometheus Metrics
Metrics available at `http://127.0.0.1:4104/metrics`

## Additional Resources
- [Elysia Documentation](https://elysiajs.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [NATS Documentation](https://nats.io/)
- [Bun Runtime](https://bun.sh/)
- [TypeScript](https://www.typescriptlang.org/)