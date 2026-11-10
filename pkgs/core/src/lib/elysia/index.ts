import { t, type TSchema } from "elysia";

/** Standard success envelope: `{ data: ... }`. */
export function withData<T extends TSchema>(schema: T) {
  return t.Object({ data: schema });
}

/** Standard error envelope: `{ error: "CODE" }`. */
export function withError<T extends TSchema>(schema?: T) {
  return t.Object({ error: schema ?? t.String() });
}
