import { urls } from "#/shared/constants/urls";
import { MAP_URL } from "#/shared/env";
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia";

const getServerMapUrl = (v: string) => MAP_URL.replace("[X]", v)

const servers = [
  { name: "Bisquite", value: "bisquite", href: getServerMapUrl("bisquite"), img: "" },
  { name: "Muffin", value: "muffin", href: getServerMapUrl("muffin"), img: "" },
]

export const serversWithMap = new Elysia()
  .get("/servers-with-map", async () => {
    const data = servers;
    return { data }
  }, {
    response: {
      200: withData(
        t.Array(
          t.Object({
            name: t.String(),
            value: t.String(),
            href: t.String(),
            img: t.String(),
          })
        )
      )
    }
  })

export const serverip = new Elysia()
  .get("/server-ip", async ({ set }) => {
    const list = urls.get();
    const ip = list.get("server_proxy")

    set.headers["Cache-Control"] = "public, max-age=600, s-maxage=600"
    set.headers["vary"] = "Origin";
    
    return { data: { ip } }
  }, {
    response: {
      200: withData(
        t.Object({
          ip: t.Optional(t.String())
        })
      )
    }
  })