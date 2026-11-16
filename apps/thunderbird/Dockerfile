# syntax=docker/dockerfile:1
FROM oven/bun:1 AS build

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

COPY --from=build /entrypoint.sh /entrypoint.sh
COPY --from=build /apps/thunderbird/dist ./apps/thunderbird/dist

WORKDIR /apps/thunderbird

ENV NODE_ENV=production
USER bun

CMD ["/bin/sh", "/entrypoint.sh"]
