import { type PageContextServer } from "vike/types";
import { redirect } from "vike/abort";
import { logRouting } from "@/shared/lib/log";
import { getIsAuthed } from "@/shared/models/app/utils";

export function guard(pageCtx: PageContextServer) {
	logRouting(pageCtx.urlPathname, "guard");

	const isAuth = getIsAuthed(pageCtx.snapshot);
	if (isAuth) throw redirect("/");
};
