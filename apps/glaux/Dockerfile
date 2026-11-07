# syntax=docker/dockerfile:1
FROM oven/bun:1 AS build

# Pinned Infisical CLI, fetched from the GitHub release with a checksum: the apt
# repository on artifacts-cli.infisical.com hangs behind the deploy network.
ARG INFISICAL_VERSION=0.44.11
ARG STAGE=staging

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  unzip \
  && rm -rf /var/lib/apt/lists/*

RUN set -eu; \
  base="https://github.com/Infisical/cli/releases/download/v${INFISICAL_VERSION}"; \
  curl -fsSL "$base/cli_${INFISICAL_VERSION}_linux_amd64.tar.gz" -o /tmp/infisical.tgz; \
  curl -fsSL "$base/checksums.txt" -o /tmp/infisical.checksums; \
  expected="$(grep "cli_${INFISICAL_VERSION}_linux_amd64.tar.gz$" /tmp/infisical.checksums | awk '{print $1}')"; \
  actual="$(sha256sum /tmp/infisical.tgz | awk '{print $1}')"; \
  [ -n "$expected" ] && [ "$expected" = "$actual" ]; \
  tar -xzf /tmp/infisical.tgz -C /tmp infisical; \
  install -m 0755 /tmp/infisical /usr/bin/infisical; \
  rm -f /tmp/infisical /tmp/infisical.tgz /tmp/infisical.checksums

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

COPY --from=build /usr/bin/infisical /usr/bin/infisical
COPY --from=build /entrypoint.sh /entrypoint.sh
COPY --from=build /apps/glaux/dist ./apps/glaux/dist

WORKDIR /apps/glaux

ENV NODE_ENV=production
USER bun

CMD ["/bin/sh", "/entrypoint.sh"]
