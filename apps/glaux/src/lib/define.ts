import Elysia from "elysia"

export const SESSION_KEY = "session";

export const defineSession = () => new Elysia({ name: "defineSession" })
  .derive(({ cookie }) => ({ session: cookie[SESSION_KEY]?.value as string | null ?? null }))
  .as("global");
