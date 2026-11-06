# syntax=docker/dockerfile:1
FROM oven/bun:1 AS build

# Pinned Infisical CLI. The release asset is fetched from GitHub instead of the
# apt repository: artifacts-cli.infisical.com hangs behind the deploy network.
ARG INFISICAL_VERSION=0.44.11

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
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

# private packages live in GitHub Packages; the token arrives as a build secret

WORKDIR /

# Manifests first: the dependency layer must survive source changes.
COPY --parents package.json bun.lock bunfig.toml apps/thunderbird/package.json apps/workers/*/package.json pkgs/*/package.json ./

COPY apps/thunderbird/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN --mount=type=secret,id=npm_token \
  sh -c 'if [ -s /run/secrets/npm_token ]; then printf "@projectfasberry:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\nalways-auth=true\n" "$(cat /run/secrets/npm_token)" > /root/.npmrc; fi' \
  && bun install --frozen-lockfile --ignore-scripts

COPY apps/thunderbird ./apps/thunderbird
COPY pkgs ./pkgs

WORKDIR /apps/thunderbird
RUN bun run build:prod

FROM oven/bun:1-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  unzip \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ARG STAGE
ENV STAGE=$STAGE

WORKDIR /

COPY --from=build --parents /package.json /bun.lock /apps/thunderbird/package.json /apps/workers/*/package.json /pkgs/*/package.json ./

RUN --mount=type=secret,id=npm_token \
  sh -c 'if [ -s /run/secrets/npm_token ]; then printf "@projectfasberry:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\nalways-auth=true\n" "$(cat /run/secrets/npm_token)" > /root/.npmrc; fi' \
  && bun install --frozen-lockfile --production --ignore-scripts

COPY --from=build /usr/bin/infisical /usr/bin/infisical
COPY --from=build /entrypoint.sh /entrypoint.sh
COPY --from=build /apps/thunderbird/dist ./apps/thunderbird/dist

WORKDIR /apps/thunderbird

ENV NODE_ENV=production
USER bun

CMD ["/bin/sh", "/entrypoint.sh"]
