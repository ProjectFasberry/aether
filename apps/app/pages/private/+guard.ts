import { PageContextServer } from "vike/types";
import { redirect } from "vike/abort";
import { logRouting } from "@/shared/lib/log";
import { CONFIG_PANEL_READ_PERMISSION, CURRENT_USER_KEY } from "@/shared/models/current-user.model";

type MePayload = ExtractApiData<"getMe">["data"];

export const guard = async (pageCtx: PageContextServer) => {
  logRouting(pageCtx.urlPathname, "guard");

  const user = pageCtx.snapshot[CURRENT_USER_KEY]?.data as MePayload ?? null;
  if (!user) throw redirect("/")

  const isValid = user.meta.permissions.includes(CONFIG_PANEL_READ_PERMISSION);
  if (!isValid) throw redirect("/")
}