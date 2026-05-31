import { getStaticUrl } from "#/helpers/volume";
import { type Static, t } from "elysia";

export const modpackPayloadSchema = t.Object({
  id: t.Number(),
  client: t.String(),
  created_at: t.String(),
  imageUrl: t.String(),
  mods: t.String(),
  name: t.String(),
  shaders: t.Nullable(t.String()),
  version: t.String(),
  downloadLink: t.String()
})

const modpackRawPayloadSchema = t.Object({
  id: t.Number(),
  client: t.String(),
  created_at: t.Date(),
  imageUrl: t.String(),
  mods: t.String(),
  name: t.String(),
  shaders: t.Nullable(t.String()),
  version: t.String(),
  downloadLink: t.String()
})

const FALLBACK_MODPACK_IMAGE = getStaticUrl("arts/1.png")

export function processModpack(modpack: Static<typeof modpackRawPayloadSchema>): Static<typeof modpackPayloadSchema> {
  const mods = () => {
    // const parsed = safeJsonParse<string[]>(modpack.mods);
    // if (!parsed.ok) return modpack.mods;
    return modpack.mods
  }

  const shaders = () => {
    if (!modpack.shaders) return null;
    // const parsed = safeJsonParse<string[]>(modpack.shaders);
    // if (!parsed.ok) return modpack.shaders;
    return modpack.shaders;
  }

  return {
    ...modpack,
    created_at: modpack.created_at.toString(),
    mods: mods(),
    shaders: shaders(),
    imageUrl: modpack.imageUrl ? getStaticUrl(modpack.imageUrl) : FALLBACK_MODPACK_IMAGE
  }
}
