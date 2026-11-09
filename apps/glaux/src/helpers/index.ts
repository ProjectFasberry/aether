import { t, TSchema } from "elysia";

export function withData<T extends TSchema>(schema: T) {
  return t.Object({ data: schema });
}

export function withError<T extends TSchema>(schema?: T) {
  return t.Object({ error: schema ?? t.String() })
}