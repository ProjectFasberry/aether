import { getStaticUrl } from "#/helpers/volume";

export function resolveStoreImageUrl(target?: string | null) {
  if (!target) {
    return getStaticUrl("icons/adventure_icon.png")
  }

  if (target.includes("https://")) {
    return target;
  }

  return getStaticUrl(target)
}
