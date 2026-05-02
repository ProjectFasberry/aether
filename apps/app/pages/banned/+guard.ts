import { APP_OPTIONS_KEY, AppOptionsPayload } from "@/shared/models/app.model";
import { redirect } from "vike/abort";
import { PageContextServer } from "vike/types";

export async function guard(pageContext: PageContextServer) {
  const actualSnapshot = pageContext.snapshot[APP_OPTIONS_KEY].data as AppOptionsPayload;

  if (!actualSnapshot) {
    throw new Error("Snapshot is not defined")
  }

  const isBanned = actualSnapshot.isBanned;

  if (!isBanned) {
    throw redirect("/")
  }
}