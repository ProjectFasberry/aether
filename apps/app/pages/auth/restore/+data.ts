import { logRouting } from "@/shared/lib/log";
import { type PageContext } from "vike/types";

export async function data(pageCtx: PageContext) {
  logRouting(pageCtx.urlPathname, "data")
}