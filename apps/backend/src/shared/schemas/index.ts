import { t, type TSchema } from "elysia";
import * as z from "zod/v4";

export const metaSchema = z.object({
  asc: z.stringbool().or(z.boolean()).optional().default(true),
  startCursor: z.string().optional(),
  endCursor: z.string().optional(),
  limit: z.coerce.number().max(64).optional().default(32)
})

export const searchQuerySchema = z.string().transform(v => v.trim().length === 0 ? undefined : v).optional()

export function withData<T extends TSchema>(schema: T) {
  return t.Object({ data: schema }) as TSchema;
}

export const withMeta = t.Object({
  hasNextPage: t.Boolean(),
  hasPrevPage: t.Boolean(),
  startCursor: t.Optional(t.String()),
  endCursor: t.Optional(t.String())
})

export const withError = t.Object({ error: t.String() })