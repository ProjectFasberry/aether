FROM oven/bun:1 AS build

WORKDIR /

COPY bun.lock* package.json bunfig.toml ./
COPY apps/panel ./apps/panel
COPY packages ./packages

RUN bun install

COPY apps/panel ./apps/panel
COPY packages ./packages

WORKDIR /apps/panel
RUN bun run build

FROM oven/bun:1-slim AS runtime

WORKDIR /

COPY --from=build /apps/panel/dist ./dist

ENV NODE_ENV=production
USER bun

CMD ["bun", "./dist/index.js"]
EXPOSE 4105