FROM oven/bun:1 AS build

WORKDIR /

COPY bun.lock* package.json bunfig.toml ./
COPY apps/backend ./apps/backend
COPY packages ./packages

RUN bun install

WORKDIR /apps/backend
RUN bun run build

FROM oven/bun:1-slim AS runtime

WORKDIR /

COPY --from=build /apps/backend/dist ./dist

ENV NODE_ENV=production
USER bun

CMD ["bun", "./dist/index.js"]
EXPOSE 4104