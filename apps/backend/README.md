# Fasberry Backend

High-performance backend API for the Fasberry Minecraft ecosystem. Built with Elysia (Bun runtime framework) providing RESTful endpoints with real-time capabilities, database management, and integrations with NATS, Redis, and Minecraft servers.

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

- **Runtime**: Bun ≥ 1.2.0
- **Framework**: Elysia 1.4.16
- **Database**: Drizzle ORM 0.44.2 with SQLite/PostgreSQL
- **Message Queue**: NATS 3.2.0 with JetStream
- **Cache**: Redis
- **File Storage**: MinIO
- **Language**: TypeScript
- **Monitoring**: Prometheus + Grafana (optional)

## Requirements

- **Bun** ≥ 1.2.0
- **Node.js** ≥ 22
- **Git** ≥ 2.40
- **Docker** & **Docker Compose** (for infrastructure)

## Installation

### From Root Directory

```bash
# Install all dependencies
bun install
```

### From Backend Directory

```bash
cd apps/backend
bun install
```

## Environment Setup

Create a `.env.local` file or set in environment variables:

```env
# Database
DATABASE_URL=sqlite:./data/db/main/data/main.db

# API Server
PORT=4104
NODE_ENV=development

# Redis
REDIS_URL=redis://localhost:6379

# NATS
NATS_SERVERS=nats://localhost:4222

# MinIO
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# JWT Auth
JWT_SECRET=your-secret-key

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=
```

## Infrastructure Setup

The project includes Docker Compose configuration for all supporting services:

```bash
# From root directory
bun run docker-start

# This starts:
# - PostgreSQL/SQLite database
# - Redis cache
# - NATS message broker
# - MinIO object storage
# - Dragonfly (optional cache layer)
```

To stop:
```bash
bun run docker-down
```

## Getting Started

### Development Server

```bash
# From root
bun dev

# From backend directory
bun run dev
```

**Features**:
- Watch mode: Auto-restarts on file changes
- File system watching
- Development logging
- Quick startup time

The API will be available at `http://localhost:4104`

### API Documentation

Once the server is running:
- **Swagger UI**: `http://localhost:4104/swagger/`
- **OpenAPI Spec**: `http://localhost:4104/swagger/json`

Auto-generated from Elysia definitions using `@elysiajs/openapi`.

## Building

### Production Build

```bash
# From root
bun backend:build

# From backend directory
bun run build
```

Creates optimized production bundle:
- Output: `./dist/index.js`
- Minified and tree-shaken
- No development code

### Running Production Build

```bash
bun run start
```

Requires `NODE_ENV=production`.

## Docker

Build and deploy using Docker:

```bash
# Build Docker image
make build

# Tag for registry
make tag

# Push to registry
make push

# All steps
make release
```

**Configuration**: Requires environment variables in `../../.env`:
- `REGISTRY_HOST` - Docker registry host
- `REGISTRY_PROJECT` - Project namespace
- `REGISTRY_BACKEND_IMAGE` - Image name

## Database Management

### Drizzle Kit Commands

```bash
# Generate migrations from schema changes
bun run db:generate

# Run pending migrations
bun run db:migrate

# Pull current database state
bun run db:pull

# Push schema to database
bun run db:push
```

### Database Studio (GUI)

```bash
# Open Drizzle Studio for database inspection/editing
bun run db:studio
```

Access at `http://localhost:3000` (default)

### Schema Location

Database schemas defined in: `src/drizzle/schema/`

## Project Structure

```
apps/backend/
├── src/
│   ├── app.ts                  # Main Elysia app configuration
│   ├── index.ts                # Entry point & startup
│   ├── modules/                # Feature modules (organized by domain)
│   │   ├── auth/               # Authentication & authorization
│   │   ├── user/               # User management
│   │   ├── server/             # Minecraft server operations
│   │   ├── store/              # Store/marketplace
│   │   ├── private/            # Admin endpoints
│   │   └── ...
│   ├── lib/                    # Shared utilities
│   │   ├── plugins/            # Elysia plugins (auth, rate limit, cors, etc.)
│   │   ├── middlewares/        # Route middlewares
│   │   └── types.ts            # Shared types
│   ├── utils/                  # Helper functions
│   │   └── config/             # Configuration utilities
│   ├── shared/                 # Shared services
│   │   ├── database/           # Database initialization
│   │   ├── redis/              # Redis client setup
│   │   ├── nats/               # NATS client & pub/sub
│   │   ├── minio/              # File storage client
│   │   ├── cron/               # Scheduled jobs
│   │   ├── rcon/               # Minecraft RCON commands
│   │   ├── bot/                # Telegram bot integration
│   │   └── env.ts              # Environment variables
│   ├── drizzle/                # ORM schema & migrations
│   │   └── schema/             # Database tables
│   └── imports.ts              # Module path aliases
├── scripts/
│   ├── build.ts                # Custom build script
│   └── studio.ts               # Drizzle Studio launcher
├── drizzle.config.ts           # Drizzle configuration
├── tsconfig.json
├── Makefile                    # Docker build commands
├── Dockerfile                  # Container definition
└── package.json
```

## Available Scripts

```json
{
  "dev": "NODE_ENV=development bun run --watch ./src/index.ts",
  "start": "NODE_ENV=production bun run ./dist/index.js",
  "build": "NODE_ENV=production bun run ./scripts/build.ts",
  "type-check": "tsc --noEmit",
  "lint": "bunx biome lint",
  "db:generate": "bun run drizzle-kit generate",
  "db:migrate": "bun run drizzle-kit migrate",
  "db:studio": "bun run ./scripts/studio.ts",
  "db:pull": "bun run drizzle-kit pull",
  "db:push": "bun run drizzle-kit push",
  "build:prod": "make build",
  "release": "make build && make tag && make push"
}
```

## Key Features

### Authentication & Security
- **Bearer Token** authentication with `@elysiajs/bearer`
- **CORS** policy enforcement with `@elysiajs/cors`
- **Rate Limiting** per endpoint with `elysia-rate-limit`
- **Password Hashing** with bcryptjs
- **Session Management** with cookie-based sessions

### API Features
- **Server Timing** metrics in response headers
- **Prometheus** metrics collection at `/metrics`
- **IP Detection** from headers/socket
- **OpenAPI** documentation generation
- **Error Handling** with Http Status Codes

### Real-time Communication
- **NATS JetStream** for event streaming
- **NATS Core** for pub/sub messaging
- Persistent message queues
- Consumer groups for load balancing

### Database
- **Drizzle ORM** for type-safe database queries
- **Schema Migrations** with auto-generation
- Support for SQLite (dev) and PostgreSQL (prod)
- Schema introspection and editing

### Scheduled Tasks
- **Croner** for cron job scheduling
- Automatic job execution
- In-process job running

## API Patterns

### Route Definition

```typescript
// Module route group
export const userRoutes = new Elysia()
  .use(requireAuth())
  .get('/user/profile', getUserProfile)
  .patch('/user/profile', updateUserProfile)
```

### Error Handling

```typescript
// Standard error response
throw new Error('User not found')
// Returns 500 with error message

// Http status codes plugin
return {
  statusCode: 404,
  body: { error: 'Not found' }
}
```

### Query Parameters

```typescript
// Type-safe query parsing
.get('/items', ({ query }) => {
  const { limit = 10, offset = 0 } = query
  return getItems(limit, offset)
})
```

## Development Tips

### Database Changes

1. Update schema in `drizzle/schema/`
2. Run: `bun run db:generate`
3. Run: `bun run db:migrate`
4. Run: `bun run db:studio` to verify (optional)

### Adding New Routes

Create module in `src/modules/feature/`:
```typescript
export const featureRoutes = new Elysia({ prefix: '/feature' })
  .get('/', getFeatures)
  .post('/', createFeature)
```

Then use in `app.ts`: `app.use(featureRoutes)`

### Testing NATS Messages

```typescript
// Publish
await nats.publish('topic', { data: 'value' })

// Subscribe
nats.subscribe('topic', (msg) => {
  console.log(msg.data)
})
```

### MinIO File Upload

```typescript
const file = await minioClient.putObject(
  'bucket-name',
  'file-path',
  fileBuffer
)
```

## Monitoring

### Prometheus Metrics

Metrics available at `http://localhost:4104/metrics`

Common metrics:
- Request count and duration
- Error rates
- Database query times
- Cache hit/miss ratios

### Logging

Console output includes:
- Request/response logging
- Database operations
- Error stack traces
- Service initialization status

## Troubleshooting

### Port Already in Use
```bash
PORT=4105 bun run dev
```

### Database Connection Error
```bash
# Check database is running
docker ps | grep postgres

# Verify DATABASE_URL env var
echo $DATABASE_URL

# Reset database
bun run db:push
```

### NATS Connection Failed
```bash
# Check NATS is running
docker ps | grep nats

# Verify NATS_SERVERS env var
echo $NATS_SERVERS
```

### Out of Memory
```bash
# Increase Bun memory limit
NODE_OPTIONS="--max-old-space-size=4096" bun run dev
```

## Performance Optimization

- **AOT Compilation**: Enabled by default in Elysia config
- **Request Batching**: NATS JetStream batching
- **Connection Pooling**: Database connections pooled
- **Caching**: Redis for frequently accessed data
- **Rate Limiting**: Protects against abuse

## Additional Resources

- [Elysia Documentation](https://elysiajs.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [NATS Documentation](https://nats.io/)
- [Bun Runtime](https://bun.sh/)
- [TypeScript](https://www.typescriptlang.org/)

## Contributing

Follow TypeScript and linting standards. Run before committing:
```bash
bun run type-check
bun run lint
```

## License

MIT