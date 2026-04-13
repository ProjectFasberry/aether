FROM oven/bun:1 AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  && curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | bash \
  && apt-get update && apt-get install -y infisical \
  && rm -rf /var/lib/apt/lists/*
  
WORKDIR /

COPY bun.lock* package.json bunfig.toml ./

COPY apps/app ./apps/app
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY packages/config-typescript ./packages/config-typescript
COPY packages/config-biome ./packages/config-biome

COPY apps/app/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN bun install
WORKDIR /apps/app

ENV NODE_ENV=production

ARG INFISICAL_CLIENT_ID
ARG INFISICAL_CLIENT_SECRET
ARG INFISICAL_PROJECT_ID
ARG INFISICAL_API_URL

RUN export INFISICAL_TOKEN=$(infisical login \
  --method=universal-auth \
  --client-id="$INFISICAL_CLIENT_ID" \
  --client-secret="$INFISICAL_CLIENT_SECRET" \
  --plain --silent) && \
  infisical run --projectId "$INFISICAL_PROJECT_ID" --env prod --path /app -- bun run build
  
FROM oven/bun:1-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /

COPY --from=build /usr/bin/infisical /usr/bin/infisical
COPY --from=build /entrypoint.sh /entrypoint.sh
COPY --from=build /apps/app/dist ./dist
COPY --from=build /apps/app/package.json ./package.json

ENV NODE_ENV=production
USER bun

CMD ["/bin/sh", "/entrypoint.sh"]
EXPOSE 3003