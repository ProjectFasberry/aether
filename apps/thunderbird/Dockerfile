FROM oven/bun:1 AS build

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

RUN bun install --ignore-scripts

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

RUN bun install --production --ignore-scripts

COPY --from=build /usr/bin/infisical /usr/bin/infisical
COPY --from=build /entrypoint.sh /entrypoint.sh
COPY --from=build /apps/thunderbird/dist ./apps/thunderbird/dist

WORKDIR /apps/thunderbird

ENV NODE_ENV=production
USER bun

CMD ["/bin/sh", "/entrypoint.sh"]
