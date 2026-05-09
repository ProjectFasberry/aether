import { logRouting } from "@/shared/lib/log";
import { PageContext } from "vike/types";

export const data = async (pageCtx: PageContext) => {
  logRouting(pageCtx.urlPathname, "data")
}