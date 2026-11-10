import { randomUUID } from "node:crypto";
import Elysia from "elysia";

/**
 * Accepts a request id from the edge or generates one, echoes it back and keeps
 * it in the context so error logs can be correlated with the response.
 */
export const requestIdPlugin = () => new Elysia({ name: "requestIdPlugin" })
  .onRequest(({ request, set, store }) => {
    const id = request.headers.get("x-request-id")?.trim() || randomUUID();

    (store as Record<string, unknown>)["requestId"] = id;
    set.headers["x-request-id"] = id;
  })
  .derive(({ store }) => ({
    requestId: String((store as Record<string, unknown>)["requestId"] ?? ""),
  }))
  .as("global");
