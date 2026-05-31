import { defineConfig } from "drizzle-kit";
import * as z from "zod";
import redact from "slow-redact";
import consola from "consola";

const sanitize = redact({
	censor: "[REDACTED]",
	serialize: (value) => {
		if (typeof value === "string") {
			return value.replace(/(:\/\/[^:]+:)([^@]+)(@)/g, "$1[REDACTED]$3");
		}
		return JSON.stringify(value);
	},
});

const databaseSchema = z.object({
	SELECTED_DATABASE: z.string(),
	SELECTED_URL: z.string(),
	SELECTED_DIALECT: z.enum(["postgresql", "mysql"]),
});

const { SELECTED_DATABASE, SELECTED_URL, SELECTED_DIALECT } = databaseSchema.parse(process.env);

consola.box(`
  Selected database "${SELECTED_DATABASE}" (${SELECTED_DIALECT})\n(url=${sanitize(SELECTED_URL)})
`);

export default defineConfig({
	schema: `./drizzle/${SELECTED_DATABASE}/noop.ts`,
	out: `./drizzle`,
	dialect: SELECTED_DIALECT,
	dbCredentials: {
		url: SELECTED_URL,
	},
});
