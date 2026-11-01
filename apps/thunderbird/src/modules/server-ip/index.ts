import { withData } from "#/shared/schemas";
import Elysia from "elysia";
import { getServers, serverPayloadSchema } from "./server-ip.model";
import { buildRouteSummary } from "#/utils";

export const serversWithMap = new Elysia()
  .get("/servers-with-map", async () => {
    const data = await getServers();
    return { data }
  }, {
    response: {
      200: withData(serverPayloadSchema)
    },
    detail: {
      summary: buildRouteSummary("Get servers with map")
    }
  })
