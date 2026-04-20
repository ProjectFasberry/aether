export const isProduction = Bun.env.NODE_ENV === "production";
export const REDIS_HOST = Bun.env.REDIS_HOST;
export const REDIS_PORT = Bun.env.REDIS_PORT;
export const REDIS_PASSWORD = Bun.env.REDIS_PASSWORD;
export const REDIS_USER = Bun.env.REDIS_USER;
export const GENERAL_POSTGRES_URI = Bun.env.GENERAL_POSTGRES_URI;
export const PORT = Bun.env.PORT;
export const BOT_GUARD_TOKEN = Bun.env.BOT_GUARD_TOKEN;
