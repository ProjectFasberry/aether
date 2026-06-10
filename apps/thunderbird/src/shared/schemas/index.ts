import { t, type TSchema } from "elysia";

export function parseBool(v: string | boolean) {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return true;
}

export const createStringBoolSchema = (defaultValue?: boolean) => {
  return t
    .Transform(t.Union([t.Boolean(), t.String()], { default: defaultValue ?? false }))
    .Decode(v => parseBool(v))
    .Encode(v => v)
}

export const metaSchema = t.Object({
  asc: t.Optional(createStringBoolSchema()),
  startCursor: t.Optional(t.String()),
  endCursor: t.Optional(t.String()),
  limit: t
    .Transform(
      t.Number({ maximum: 64, default: 32 })
    )
    .Decode(v => v ?? 32)
    .Encode(v => v)
});

export const searchQuerySchema = t.Optional(
  t.Transform(t.String())
    .Decode(v => (v.trim().length === 0 ? undefined : v.trim()))
    .Encode(v => v || '')
);

export function withData<T extends TSchema>(schema: T) {
  return t.Object({ data: schema }) as TSchema;
}

export const withMeta = t.Object({
  hasNextPage: t.Boolean(),
  hasPrevPage: t.Boolean(),
  startCursor: t.Optional(t.String()),
  endCursor: t.Optional(t.String())
})

export function withError<T extends TSchema>(schema?: T) {
  return t.Object({ error: schema ?? t.String() })
}