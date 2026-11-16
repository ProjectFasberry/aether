# syntax=docker/dockerfile:1
FROM oven/bun:1 AS build

ARG STAGE=staging

WORKDIR /

# Manifests first: the dependency layer must survive source changes.
COPY --parents package.json bun.lock bunfig.toml apps/glaux/package.json apps/workers/*/package.json pkgs/*/package.json ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY apps/glaux ./apps/glaux
COPY pkgs ./pkgs

COPY apps/glaux/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /apps/glaux
RUN if [ "$STAGE" = "prod" ]; then bun run build:prod; else bun run build; fi

FROM oven/bun:1-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ARG STAGE
ENV STAGE=$STAGE

WORKDIR /

COPY --from=build --parents /package.json /bun.lock /apps/glaux/package.json /apps/workers/*/package.json /pkgs/*/package.json ./
RUN bun install --frozen-lockfile --production --ignore-scripts

COPY --from=build /entrypoint.sh /entrypoint.sh
COPY --from=build /apps/glaux/dist ./apps/glaux/dist

WORKDIR /apps/glaux

ENV NODE_ENV=production
USER bun

CMD ["/bin/sh", "/entrypoint.sh"]
