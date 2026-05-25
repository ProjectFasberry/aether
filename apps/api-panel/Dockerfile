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
COPY apps/panel ./apps/panel
COPY packages ./packages

COPY apps/panel/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN bun install

WORKDIR /apps/panel
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
COPY --from=build /apps/panel/package.json ./apps/panel/package.json
COPY --from=build /packages ./packages

RUN bun install --production

COPY --from=build /usr/bin/infisical /usr/bin/infisical
COPY --from=build /entrypoint.sh /entrypoint.sh
COPY --from=build /apps/panel/dist ./apps/panel/dist

WORKDIR /apps/panel

ENV NODE_ENV=production
USER bun

CMD ["/bin/sh", "/entrypoint.sh"]