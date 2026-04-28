import { logRouting } from "@/shared/lib/log";
import { getIsAuth } from "@/shared/lib/utils";
import { redirect } from "vike/abort";
import { PageContext } from "vike/types";

export const guard = async (pageCtx: PageContext) => {
  logRouting(pageCtx.urlPathname, "guard");

  const isAuth = getIsAuth(pageCtx.snapshot)
  if (!isAuth) throw redirect("/auth")
}