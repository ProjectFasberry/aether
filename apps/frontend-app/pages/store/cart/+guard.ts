import { logRouting } from "@/shared/lib/log";
import { getIsAuthed } from "@/shared/models/app/utils";
import { redirect } from "vike/abort";
import { type PageContext } from "vike/types";

export function guard(pageCtx: PageContext) {
  logRouting(pageCtx.urlPathname, "guard");

  const isAuth = getIsAuthed(pageCtx.snapshot)
  if (!isAuth) throw redirect("/auth")
}