# Fasberry Minecraft

[![License](https://img.shields.io/github/license/ProjectFasberry/fasberry?style=for-the-badge)](./LICENSE)

Unified monorepo containing all applications and shared packages for the Fasberry Minecraft ecosystem. Built with **Bun** for fast, unified dependency management and task execution.

---

## 1. Overview

Fasberry Minecraft is a full-stack Minecraft platform with:

| Component | Type | Purpose |
|-----------|------|---------|
| `app` | React Frontend | User dashboard for server control and management |
| `landing` | React Frontend | Public landing page deployed on Vercel |
| `backend` | Elysia API | Core REST API with NATS, Redis, PostgreSQL |
| `ui` | Library | Shared React components (Radix UI + Tailwind) |
| `shared` | Library | Shared types, utilities, and constants |

---

## 2. Requirements

- **Bun** ≥ 1.2.0
- **Node.js** ≥ 22
- **Docker** & **Docker Compose** (infrastructure only)
- **Git** ≥ 2.40
- OS: macOS, Linux, or WSL2 (Windows)

Install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
```

---

## 3. Quick Start

### Installation

```bash
git clone https://github.com/ProjectFasberry/fasberry.git
cd fasberry
bun install
```

### Development Mode

```bash
# Start infrastructure services
bun run docker-start

# Start all applications (dev mode with HMR)
bun run dev
```

**What launches:**
- `backend` → `http://localhost:4104` (REST API + Swagger)
- `app` → `http://localhost:3000` (React app)
- `landing` → `http://localhost:3005` (Landing page)

**Dev mode features:**
- Hot Module Replacement (HMR) for React components
- File watch and auto-restart
- Source maps and full stack traces
- TypeScript type checking
- Console output with clear separation per app

### Production Mode

```bash
# Build all applications
bun run build

# Run production builds
bun run start
```

**Differences from dev:**
- No HMR (static compiled code)
- Optimized bundles (minified, tree-shaken)
- No source maps
- Production environment variables used
- Better performance and smaller footprint

---

## 4. Docker & Infrastructure

### Development Infrastructure

Start supporting services (PostgreSQL, Redis, NATS, MinIO, etc.):

```bash
bun run docker-start
```

**What starts:**
- **PostgreSQL** - Primary database (`localhost:5432`)
- **Redis** - Cache layer (`localhost:6379`)
- **NATS** - Message broker (`localhost:4222`)
- **MinIO** - Object storage (`localhost:9000`)
- **Dragonfly** - Cache (optional)

Stop services:
```bash
bun run docker-down
```

Check status:
```bash
docker ps
docker compose logs [service]
```

### Production Deployment

Build Docker images per app:

```bash
# App
cd apps/app && make release

# Backend
cd apps/backend && make release

# Landing
cd apps/landing && vercel deploy --prebuilt --prod
```

Each app has its own Dockerfile and Makefile for containerization.

---

## 5. Project Structure

```
fasberry-minecraft/
├── apps/                    # Applications
│   ├── app/                # React frontend (main dashboard)
│   │   ├── pages/          # File-based routes
│   │   ├── renderer/       # Vike configuration
│   │   ├── server/         # Node.js server entry
│   │   ├── shared/         # App-specific utilities
│   │   └── public/         # Static assets
│   ├── landing/            # Public landing page (Vercel)
│   │   ├── pages/          # Static pages
│   │   ├── renderer/       # Layout & meta configuration
│   │   └── shared/         # Landing utilities
│   └── backend/            # Elysia REST API
│       ├── src/
│       │   ├── app.ts      # API configuration
│       │   ├── index.ts    # Startup entry
│       │   ├── modules/    # Route handlers by feature
│       │   ├── lib/        # Plugins & middlewares
│       │   ├── shared/     # Services (DB, Redis, NATS, etc.)
│       │   └── drizzle/    # Database schema & migrations
│       ├── scripts/        # Build & studio scripts
│       └── Dockerfile
├── packages/               # Shared libraries
│   ├── ui/                # React component library
│   │   └── src/components/
│   ├── shared/            # Types, utilities, constants
│   ├── config-typescript/ # shared tsconfig.json
│   └── config-biome/      # Shared biome.json
├── data/                   # Docker volume mounts (gitignored)
│   ├── db/                # Database data
│   ├── minio/             # S3-like storage
│   ├── nats/              # NATS persistence
│   └── redis/             # Redis data
├── scripts/               # Root scripts
│   └── run.ts             # Task runner (dev/build/lint orchestration)
├── docker-compose.yml     # Infrastructure definition
├── bunfig.toml            # Bun configuration
├── biome.json             # Linting config (monorepo)
├── tsconfig.json          # TypeScript config (monorepo)
└── package.json           # Root dependencies & scripts
```

### Key Directories

| Path | Purpose |
|------|---------|
| `apps/app` | Main dashboard React app |
| `apps/backend` | REST API server |
| `apps/landing` | Public landing page |
| `packages/ui` | Reusable components |
| `packages/shared` | Shared types & constants |
| `data/` | Docker volumes for services |
| `scripts/` | Root orchestration scripts |

---

## 6. Logging

### Development Logs

Logs appear in terminal during `bun run dev`:

```
[backend] Starting app...
[backend] ✓ App listening on http://0.0.0.0:4104
[app] VITE ready in 1234 ms
[app] ➜ App server running at:
[app] > Local: http://localhost:3000
[landing] ➜ landing server running at:
[landing] > Local: http://localhost:3005
```

**Log levels:**
- `✓` / `✔` - Success
- `⚠` - Warning
- `✕` / `✗` - Error
- `→` - Info/step

### Production Logs

Docker container logs:

```bash
# View all app logs
docker compose logs -f app

# Specific service
docker containers logs app_backend_1

# Follow in real-time
docker logs -f [container-id]
```

### Application-Specific Logs

**Backend** (`apps/backend/src/utils/config/logger.ts`):
- Request/response logging
- Database operation timing
- Error stack traces
- Service startup status

**Frontend** (`apps/app/shared/lib/logger.ts`, browser console):
- API calls
- State changes
- Component renders (dev only)
- User interactions

---

## 7. Common Commands

### Development

```bash
bun run dev          # Start all apps + watch mode
bun run dev -- --filter=backend  # Single app
bun run lint         # Lint all code
bun run type-check   # TypeScript check
```

### Building

```bash
bun run build        # Build all apps
bun app:build        # Build app only
bun backend:build    # Build backend only
bun landing:build    # Build landing only
```

### Database

```bash
# From backend directory
bun run db:generate  # Generate migrations
bun run db:migrate   # Run migrations
bun run db:studio    # Open Drizzle Studio GUI
```

### Docker

```bash
bun run docker-start      # Start infrastructure
bun run docker-down       # Stop infrastructure
bun run docker-infra:up   # Start only (no apps)
```

---

## 8. Development Workflow

### Adding a Feature

1. **Start infrastructure:**
   ```bash
   bun run docker-start
   ```

2. **Start dev servers:**
   ```bash
   bun run dev
   ```

3. **Edit code** - Changes auto-reload via HMR

4. **Commit:**
   ```bash
   bun run lint
   bun run type-check
   git commit
   ```

### Database Changes

1. Update schema in `apps/backend/src/drizzle/schema/`
2. Generate migration: `bun run db:generate`
3. Run migration: `bun run db:migrate`
4. Verify: `bun run db:studio`

### Environment Variables

Store in root `.env`:
```env
REGISTRY_HOST=your-registry-host
REGISTRY_PROJECT=your-project
REGISTRY_APP_IMAGE=app-image-name
REGISTRY_BACKEND_IMAGE=backend-image-name
```

Per-app overrides in `apps/[app]/.env.local`

---

## 9. Troubleshooting

### Port Already in Use
```bash
# App on different port
VITE_APP_PORT=3001 bun run dev

# Backend on different port
PORT=4105 bun run dev
```

### Services Won't Start
```bash
# Check Docker
docker ps
docker compose ps

# Restart services
bun run docker-down && bun run docker-start

# View logs
docker compose logs -f
```

### Build Failures
```bash
# Clean and reinstall
rm -rf node_modules dist
bun install
bun run build
```

### Type Errors
```bash
bun run type-check
```

---

## 10. Documentation

- **App README**: [apps/app/README.md](apps/app/README.md)
- **Backend README**: [apps/backend/README.md](apps/backend/README.md)
- **Landing README**: [apps/landing/README.md](apps/landing/README.md)
- **UI Library README**: [packages/ui/README.md](packages/ui/README.md)
- **Wiki**: https://deepwiki.com/ProjectFasberry/fasberry/
- **API Docs**: https://api.fasberry.fun/swagger/ (when deployed)

---

## 11. License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.
