import { type Static, t } from "elysia"
import { getUrlConfig } from "#/shared/services/config"

const mapUrl = () => getUrlConfig("map-url") ?? ""

export const serverPayloadSchema = t.Array(
  t.Object({
    name: t.String(),
    value: t.String(),
    href: t.String(),
    img: t.String(),
  })
)

export async function getServers(): Promise<Static<typeof serverPayloadSchema>> {
  const template = mapUrl();
  const getServerMapUrl = (v: string) => template.replace("[X]", v);

  return [
    { name: "Bisquite", value: "bisquite", href: getServerMapUrl("bisquite"), img: "" },
    { name: "Muffin", value: "muffin", href: getServerMapUrl("muffin"), img: "" },
  ]
}
