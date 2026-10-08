# Monorepo Maintaining Summary

A concise developer reference for architecture, patterns, and current practices in the **fasberry-api** monorepo.

---

## 1. Monorepo Architecture

The repository is structured as a **workspace-based monorepo** using **Bun** as the primary runtime, dependency manager, and task orchestrator.

```
├── apps/                 # Runnable Services
│   ├── minotaur          # Core 
│   ├── workers           # Workers / Micro services
│   └── glaux             # Panel
├── pkgs/                 # Shared Packages
│   ├── config-biome      # Shared formatting and linting base configurations
│   ├── config-drizzle    # Shared Drizzle ORM configurations
│   ├── config-typescript # Shared base tsconfig files
│   ├── core              # Shared backend logic
│   └── shared            # Shared constants, types, schemas, and utils
└── standards/            # Repository standard guidelines and documentation
```

---

## 2. Dependency & Workspace Management

- **Runtime**: [Bun](https://bun.sh/) is utilized for all operations. Do not use `npm`, `yarn`, or `pnpm`.
- **Linking**: Core configurations and domain packages are imported as dependencies using the `workspace:*` prefix:
  ```json
  "@repo/core": "workspace:*",
  "@repo/shared": "workspace:*"
  ```
- **Task Orchestration**: The workspace-wide scripts are dispatched concurrently via a custom TS script (`scripts/run.ts`). Running `bun <command>` (e.g., `bun dev`, `bun build`, `bun lint`) automatically discovers workspaces implementing that command and runs them together:
  ```bash
  bun run dev          # Concurrently start dev watchers for all apps/pkgs
  bun run type-check   # Perform tsc builds on all projects
  bun run lint         # Lint files across all active workspaces
  ```

---

## 3. Core Tech Stack & Patterns

- **Web Framework**: [Elysia](https://elysiajs.com/) for high-performance HTTP APIs.
- **Database/Querying**: [Kysely](https://kysely.dev/) query builder over MariaDB/PostgreSQL, supported by `kysely-mariadb` and `kysely-paginate`.
- **Message Broker & Queue**: NATS Core and NATS JetStream for asynchronous communication.
- **Caching & Key-Value**: Redis (`ioredis`) for high-speed cache structures.
- **Storage**: MinIO (`minio`) client for S3-compatible object storage.
- **Validation**: [Zod](https://zod.dev/) and [TypeBox](https://github.com/sinclairzx81/typebox) for runtime schema and DTO validations.

---

## 4. Current Development & Maintaining Practices

### Secrets & Environment Variables
**Infisical** is used as the single source of truth for secrets and env configuration.
- Dev and start commands are wrapped with `infisical run`:
  ```bash
  infisical run --env=dev --path=/backend -- bun run --watch ./src/index.ts
  ```
- Avoid hardcoding API keys or DB credentials in `package.json` or code files.

### Code Quality & Standards
- **Linter & Formatter**: Managed by [Biome](https://biomejs.dev/). Standardized globally with overrides configured inside `biome.json` per package.
- **Git Hooks**: [Lefthook](https://github.com/evilmartians/lefthook) runs pre-commit verification workflows.
- **Type Safety**: TypeScript Project References are defined in `tsconfig.json` at root and in respective workspace `tsconfig.json` files. Run `tsc --build` for complete verification.
- **Circular Dependencies**: Checked using `dpdm` (`bunx dpdm --no-warning ./src/index.ts`) under the `circular-check` script.

### Build System
- Apps configure a custom build runner (`scripts/build.ts`) using `Bun.build`:
  - **Staging / Dev**: Source maps enabled, no minification.
  - **Prod**: Minified code, sourcemaps disabled.
- Bundles compile into local `./dist` directories.

### Containerization & CI/CD
- **Docker**: A multi-stage `Dockerfile` is present in app directories referencing dependencies from the root monorepo workspace.
- **Makefiles**: Each app contains a `Makefile` that handles multi-platform (`linux/amd64`) image building, tagging, and pushing to the remote registry under specified `STAGE` arguments.
