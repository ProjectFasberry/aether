import { logRouting } from "@/shared/lib/log";
import { getIsAuth } from "@/shared/lib/utils";
import { wrapTitle } from "@/shared/lib/wrap-title";
import { useConfig } from "vike-react/useConfig";
import { redirect } from "vike/abort";
import { PageContext } from "vike/types";

function metadata() {
  return {
    title: wrapTitle("Рефералы")
  }
}

export const guard = async (pageContext: PageContext) => {
  logRouting(pageContext.urlPathname, "guard");

  const isAuth = getIsAuth(pageContext.snapshot)
  if (!isAuth) throw redirect("/auth")

  const config = useConfig()

  config(metadata())
}