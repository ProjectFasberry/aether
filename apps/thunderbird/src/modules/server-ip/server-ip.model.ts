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

  // Only Bisquite has a published web map today. Per-server map hosts are a
  // later step; a single card must not point at a dead host in the meantime.
  return [
    { name: "Bisquite", value: "bisquite", href: template.replace("[X]", "bisquite"), img: "" },
  ];
}
