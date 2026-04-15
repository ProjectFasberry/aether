import { logRouting } from "@/shared/lib/log";
import { render } from "vike/abort";
import { PageContext } from "vike/types";
import { qrTokenAtom } from "./+Page";
import { createCtx } from "@reatom/core";
import { mergeSnapshot } from "@/shared/lib/snapshot";

export async function data(pageContext: PageContext) {
	logRouting(pageContext.urlPathname, "data");

	const token = pageContext.urlParsed.search["token"];
	if (!token) throw render(404);

	const ctx = createCtx();

	qrTokenAtom(ctx, token);
	pageContext.snapshot = mergeSnapshot(ctx, pageContext);
}
