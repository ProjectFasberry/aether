import { PageContext } from "vike/types";
import { LANDING_ENDPOINT } from "../env";

export function getUrl(pageContext: PageContext) {
  return `${LANDING_ENDPOINT}${pageContext.urlPathname}`
}
