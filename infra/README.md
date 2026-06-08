# Infrastructure Config & Orchestration

This directory houses all infrastructure orchestration files, configurations, and utilities required to run the Fasberry platform services in development, staging, and production environments.

---

## 1. Environment Docker Compose Files

The monorepo uses two specialized `docker-compose` files depending on the execution context:

### Production Infrastructure (`docker-compose.yml`)
Spawns the core backing services used across staging/production.
- **MinIO**: High-performance S3-compatible object storage.
- **Cap Standalone**: POW CAPTCHA solution.
- **Logging Pipeline**: Uses **Fluent-bit** as a lightweight shipper running custom Lua filters (`extract_id.lua`), writing directly into **Grafana Loki** for centralized logs viewing in **Grafana**.
- **Container Registry**: Zot secure OCI-compliant registry.

### Dev & Ingress Ingress (`docker-compose.dev.yml`)
Sets up local testing and gateway routing wrappers.
- **Traefik v3.6**: Modern HTTP reverse proxy and load balancer
---

## 2. Configuration Utilities

### Traefik Config Migrator (`infra/config/traefik/scripts/transfer.js`)
Since Traefik reads routing configuration directly from a Redis/Dragonfly provider, this utility bridges static YAML definitions with runtime memory.
- **What it does**: Reads local YAML config (`dynamic.yml`), resolves and interpolates environment variables from `.env.traefik`, flattens nested object properties into a `:` delimited schema, and uploads them to Redis/Dragonfly.
- **Database Key Format**: Flattens nested keys under the custom Traefik namespace (e.g., `traefik/http/routers/my-router/rule`).

### Dragonfly DB Initializer (`infra/scripts/dragonfly/init.sh`)
Supports the setup of **Dragonfly** (a modern, drop-in replacement for Redis).
- Checks for the presence of `/data/aclfile.acl`.
- Generates a default ACL entry containing encrypted credentials (`REDIS_USER_PASSWORD`).
- Boots Dragonfly utilizing the generated ACL file.

---

## 3. Directory Layout

```
├── config/
│   ├── fluent-bit/    # Fluent-bit inputs, parser, and custom Lua metadata extractor
│   ├── loki/          # Grafana Loki storage and indexing rules
│   └── traefik/       # Ingress certs, access logs, and Redis transfer scripts
└── scripts/
    └── dragonfly/     # Dragonfly ACL bootstrap configuration
```
