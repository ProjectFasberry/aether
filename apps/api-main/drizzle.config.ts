import { logger } from "#/utils/config/logger";
import { defineConfig } from "drizzle-kit";
import * as z from "zod"
import redact from 'slow-redact';

const sanitize = redact({
  censor: '[REDACTED]',
  serialize: (value) => {
    if (typeof value === 'string') {
      return value.replace(/(:\/\/[^:]+:)([^@]+)(@)/g, '$1[REDACTED]$3');
    }
    return JSON.stringify(value);
  }
});

const databaseSchema = z.object({
  SELECTED_DATABASE: z.string(),
  SELECTED_URL: z.string(),
  SELECTED_DIALECT: z.enum(["postgresql", "mysql"]),
})

const { SELECTED_DATABASE, SELECTED_URL, SELECTED_DIALECT } = databaseSchema.parse(process.env)

logger.box(`
  Selected database "${SELECTED_DATABASE}" (${SELECTED_DIALECT})\n(url=${sanitize(SELECTED_URL)})
`)

const schemaFilter = SELECTED_DIALECT === "mysql"
  ? [SELECTED_DIALECT]
  : ["public"];

export default defineConfig({
  schema: `./src/drizzle/${SELECTED_DATABASE}/schema.ts`,
  out: `./src/drizzle`,
  dialect: SELECTED_DIALECT,
  dbCredentials: {
    url: SELECTED_URL
  },
  schemaFilter
});
