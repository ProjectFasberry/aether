import { env } from "#/shared/env"
import { type Static, t } from "elysia"

const getServerMapUrl = (v: string) => env.MAP_URL.replace("[X]", v)

export const serverPayloadSchema = t.Array(
  t.Object({
    name: t.String(),
    value: t.String(),
    href: t.String(),
    img: t.String(),
  })
)

export async function getServers(): Promise<Static<typeof serverPayloadSchema>> {
  return [
    { name: "Bisquite", value: "bisquite", href: getServerMapUrl("bisquite"), img: "" },
    { name: "Muffin", value: "muffin", href: getServerMapUrl("muffin"), img: "" },
  ]
}
