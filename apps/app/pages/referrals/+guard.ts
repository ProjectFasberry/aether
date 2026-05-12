import { logRouting } from "@/shared/lib/log";
import { getIsAuthed } from "@/shared/models/app/utils";
import { wrapTitle } from "@/shared/lib/utils";
import { useConfig } from "vike-react/useConfig";
import { redirect } from "vike/abort";
import { type PageContext } from "vike/types";

function metadata() {
  return {
    title: wrapTitle("Рефералы")
  }
}

export function guard(pageCtx: PageContext) {
  logRouting(pageCtx.urlPathname, "guard");

  const isAuth = getIsAuthed(pageCtx.snapshot)
  if (!isAuth) throw redirect("/auth")

  const config = useConfig()
  config(metadata())
}