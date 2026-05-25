import { type PageContextServer } from "vike/types";
import { redirect } from "vike/abort";
import { logRouting } from "@/shared/lib/log";
import { CONFIG_PANEL_READ_PERMISSION } from "@/shared/models/current-user/index.model";
import { getDataFromSnapshot } from "@/shared/models/app/utils";

export function guard(pageCtx: PageContextServer) {
  logRouting(pageCtx.urlPathname, "guard");

  const user = getDataFromSnapshot("currentUser", pageCtx.snapshot)
  if (!user) throw redirect("/")

  const isValid = user.meta.permissions.includes(CONFIG_PANEL_READ_PERMISSION);
  if (!isValid) throw redirect("/")
}