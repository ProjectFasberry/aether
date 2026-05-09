import { PageContextServer } from "vike/types";
import { redirect } from "vike/abort";
import { logRouting } from "@/shared/lib/log";
import { getIsAuth } from "@/shared/lib/utils";

export const guard = async (pageCtx: PageContextServer) => {
	logRouting(pageCtx.urlPathname, "guard");

	const isAuth = getIsAuth(pageCtx.snapshot);
	if (isAuth) throw redirect("/");
};
