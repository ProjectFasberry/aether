import { logRouting } from "@/shared/lib/log";
import { getIsAuthed } from "@/shared/models/app/utils";
import { redirect } from "vike/abort";
import { PageContext } from "vike/types";

export const guard = async (pageCtx: PageContext) => {
  logRouting(pageCtx.urlPathname, "guard");

  const isAuth = getIsAuthed(pageCtx.snapshot)
  if (!isAuth) throw redirect("/auth")
}