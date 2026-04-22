import { logRouting } from "@/shared/lib/log";
import { getIsAuth } from "@/shared/lib/utils";
import { redirect } from "vike/abort";
import { PageContext } from "vike/types";

export const guard = async (pageContext: PageContext) => {
  logRouting(pageContext.urlPathname, "guard");

  const isAuth = getIsAuth(pageContext.snapshot)
  if (!isAuth) throw redirect("/auth")
}