import { getObjectUrl } from "#/helpers/volume"

export const landHelpers = {
  getLandsUrl(path: string): string {
    return getObjectUrl("lands", path)
  },
  transformBanner(input?: string | null): string | null {
    if (!input) return null
    return this.getLandsUrl(input)
  },
  transformGallery(input: { url: string }[] = []): string[] {
    return input.map(row => this.getLandsUrl(row.url))
  }
}