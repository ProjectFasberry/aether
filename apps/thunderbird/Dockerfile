# syntax=docker/dockerfile:1
FROM oven/bun:1 AS build

# private packages live in GitHub Packages; the token arrives as a build secret

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  unzip \
  && curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | bash \
  && apt-get update && apt-get install -y infisical \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /

COPY bun.lock* package.json bunfig.toml ./
COPY apps/thunderbird ./apps/thunderbird
COPY pkgs ./pkgs

COPY apps/thunderbird/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN --mount=type=secret,id=npm_token \
  sh -c 'if [ -s /run/secrets/npm_token ]; then printf "@projectfasberry:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\nalways-auth=true\n" "$(cat /run/secrets/npm_token)" > /root/.npmrc; fi' \
  && bun install --ignore-scripts

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

COPY --from=build /package.json /bun.lock ./
COPY --from=build /apps/thunderbird/package.json ./apps/thunderbird/package.json
COPY --from=build /pkgs ./pkgs

RUN --mount=type=secret,id=npm_token \
  sh -c 'if [ -s /run/secrets/npm_token ]; then printf "@projectfasberry:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\nalways-auth=true\n" "$(cat /run/secrets/npm_token)" > /root/.npmrc; fi' \
  && bun install --production --ignore-scripts

COPY --from=build /usr/bin/infisical /usr/bin/infisical
COPY --from=build /entrypoint.sh /entrypoint.sh
COPY --from=build /apps/thunderbird/dist ./apps/thunderbird/dist

WORKDIR /apps/thunderbird

ENV NODE_ENV=production
USER bun

CMD ["/bin/sh", "/entrypoint.sh"]
