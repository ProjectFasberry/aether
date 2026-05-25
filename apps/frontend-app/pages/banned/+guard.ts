import { logRouting } from "@/shared/lib/log";
import { getDataFromSnapshot } from "@/shared/models/app/utils";
import { redirect } from "vike/abort";
import { type PageContextServer } from "vike/types";

export function guard(pageCtx: PageContextServer) {
  logRouting(pageCtx.urlPathname, "guard");

  const actualSnapshot = getDataFromSnapshot("appState.options", pageCtx.snapshot)
  if (!actualSnapshot) throw new Error("Snapshot is not defined")

  const isBanned = actualSnapshot.flags.isBanned;
  if (!isBanned) throw redirect("/")
}