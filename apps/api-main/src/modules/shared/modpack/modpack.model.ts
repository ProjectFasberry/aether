import { getStaticUrl } from "#/helpers/volume";
import { type Static, t } from "elysia";

export const modpackPayload = t.Object({
  id: t.Number(),
  client: t.String(),
  created_at: t.Date(),
  imageUrl: t.String(),
  mods: t.String(),
  name: t.String(),
  shaders: t.Union([t.String(), t.Null()]),
  version: t.String(),
  downloadLink: t.String()
})

export type ModpackPayload = Static<typeof modpackPayload>

const FALLBACK_MODPACK_IMAGE = getStaticUrl("arts/1.png")

export function processModpack(modpack: ModpackPayload) {
  const mods = JSON.parse(modpack.mods) as string[]
  const shaders = modpack.shaders ? JSON.parse(modpack.shaders) as string[] : []
  const imageUrl = modpack.imageUrl ? getStaticUrl(modpack.imageUrl) : FALLBACK_MODPACK_IMAGE;

  return { ...modpack, mods, shaders, imageUrl }
}