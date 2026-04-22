import { PageContextServer } from "vike/types";
import { redirect } from "vike/abort";
import { logRouting } from "@/shared/lib/log";
import { getIsAuth } from "@/shared/lib/utils";

export const guard = async (pageContext: PageContextServer) => {
	logRouting(pageContext.urlPathname, "guard");

	const isAuth = getIsAuth(pageContext.snapshot);
	if (isAuth) throw redirect("/");
};
