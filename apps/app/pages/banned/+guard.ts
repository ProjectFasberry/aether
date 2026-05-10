import { getDataFromSnapshot } from "@/shared/models/app/utils";
import { redirect } from "vike/abort";
import { PageContextServer } from "vike/types";

export async function guard(pageCtx: PageContextServer) {
  const actualSnapshot = getDataFromSnapshot("appState.options", pageCtx.snapshot)
  if (!actualSnapshot) throw new Error("Snapshot is not defined")

  const isBanned = actualSnapshot.flags.isBanned;
  if (!isBanned) throw redirect("/")
}