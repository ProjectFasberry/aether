import { invariant } from "#/helpers/invariant";
import { DATABASES } from "#/shared/constants/databases";
import { logger } from "#/utils/config/logger";
import { defineConfig } from "drizzle-kit";

const target = process.env.target as keyof typeof DATABASES;
const db = DATABASES[target] ?? undefined;
invariant(db, `Database "${target}" not found`)

const sanitizedUrl = ((u: string) => { 
  const p = new URL(u); 
  return `${p.protocol}//${p.hostname}:${p.port}${p.pathname}` 
})(db.url);

logger.box(`
  Selected database "${target}"
  (dialect=${db.dialect}, url=${sanitizedUrl})
`)

export default defineConfig({
  schema: "./src/drizzle/schema.ts",
  out: "./src/drizzle",
  dialect: db.dialect,
  dbCredentials: {
    url: db.url,
  }
});