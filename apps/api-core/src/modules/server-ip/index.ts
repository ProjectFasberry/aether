import { urlsService } from "#/shared/constants/urls";
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia";
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

export const serverip = new Elysia()
  .get("/server-ip", async ({ set }) => {
    const ip = urlsService.getData().get("server_proxy") ?? null

    set.headers["Cache-Control"] = "public, max-age=600, s-maxage=600"
    set.headers["vary"] = "Origin";

    return { data: { ip } }
  }, {
    response: {
      200: withData(
        t.Object({
          ip: t.Nullable(t.String())
        })
      )
    },
    detail: {
      summary: buildRouteSummary("Get server IP")
    }
  })
