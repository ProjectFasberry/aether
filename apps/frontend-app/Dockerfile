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

COPY apps/frontend-app ./apps/frontend-app
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY packages/config-typescript ./packages/config-typescript
COPY packages/config-biome ./packages/config-biome

COPY apps/frontend-app/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN bun install --no-cache
WORKDIR /apps/frontend-app

ARG STAGE
ARG CACHEBUST=1

ENV NODE_ENV=production

RUN --mount=type=secret,id=INFISICAL_ID \
  --mount=type=secret,id=INFISICAL_SECRET \
  --mount=type=secret,id=INFISICAL_PROJECT_ID \
  --mount=type=secret,id=INFISICAL_API_URL \
  export INFISICAL_CLIENT_ID=$(cat /run/secrets/INFISICAL_ID) && \
  export INFISICAL_CLIENT_SECRET=$(cat /run/secrets/INFISICAL_SECRET) && \
  export INFISICAL_PROJECT_ID=$(cat /run/secrets/INFISICAL_PROJECT_ID) && \
  export INFISICAL_API_URL=$(cat /run/secrets/INFISICAL_API_URL) && \
  export INFISICAL_TOKEN=$(infisical login \
  --method=universal-auth \
  --client-id="$INFISICAL_CLIENT_ID" \
  --client-secret="$INFISICAL_CLIENT_SECRET" \
  --plain --silent) && \
  infisical run --projectId="$INFISICAL_PROJECT_ID" --env="$STAGE" --path="/app" -- bun run vike build

FROM oven/bun:1-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  unzip \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ARG STAGE
ENV STAGE=$STAGE

WORKDIR /

COPY --from=build /usr/bin/infisical /usr/bin/infisical
COPY --from=build /entrypoint.sh /entrypoint.sh
COPY --from=build /apps/frontend-app/dist ./dist
COPY --from=build /apps/frontend-app/package.json ./package.json

ENV NODE_ENV=production
USER bun

CMD ["/bin/sh", "/entrypoint.sh"]
