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
  if (!template) return [];

  // Bisquite has a published web map today; Muffin is listed so the map page
  // shows what is coming, but an empty href marks the card as unavailable.
  return [
    { name: "Bisquite", value: "bisquite", href: template.replace("[X]", "bisquite"), img: "" },
    { name: "Muffin", value: "muffin", href: "", img: "" },
  ];
}
