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
COPY apps/api-panel ./apps/api-panel
COPY pkgs ./pkgs

COPY apps/api-panel/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN bun install

WORKDIR /apps/api-panel
RUN bun run build

FROM oven/bun:1-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ARG STAGE
ENV STAGE=$STAGE

WORKDIR /

COPY --from=build /package.json /bun.lock ./
COPY --from=build /apps/api-panel/package.json ./apps/api-panel/package.json
COPY --from=build /pkgs ./pkgs

RUN bun install --production

COPY --from=build /usr/bin/infisical /usr/bin/infisical
COPY --from=build /entrypoint.sh /entrypoint.sh
COPY --from=build /apps/api-panel/dist ./apps/api-panel/dist

WORKDIR /apps/api-panel

ENV NODE_ENV=production
USER bun

CMD ["/bin/sh", "/entrypoint.sh"]
