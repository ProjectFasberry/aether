FROM oven/bun:1 AS build

WORKDIR /

COPY bun.lock* package.json bunfig.toml ./

COPY apps/app ./apps/app
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY packages/config-typescript ./packages/config-typescript
COPY packages/config-biome ./packages/config-biome

RUN bun install

WORKDIR /apps/app

ENV NODE_ENV=production
RUN bun run build

FROM node:25.8.2-alpine3.23 AS runtime

WORKDIR /

COPY --from=build /apps/app/dist ./dist
COPY --from=build /apps/app/package.json ./package.json

ENV NODE_ENV=production
USER node

CMD ["node", "dist/server/index.mjs"]
EXPOSE 3003