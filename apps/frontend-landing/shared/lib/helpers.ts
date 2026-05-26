import { PageContext } from "vike/types";
import { LANDING_ENDPOINT } from "../env";
import { VOLUME_ENDPOINT } from "../env";

export function getUrl(pageContext: PageContext) {
  return `${LANDING_ENDPOINT}${pageContext.urlPathname}`
}
export const wrapTitle = (i: string) => `Fasberry › ${i}`

export function getStaticObject(path: string, target: string) {
  return `${VOLUME_ENDPOINT}/static/${path}/${target}`
}

export const isError = (e: Error | unknown): e is Error => e instanceof Error;
