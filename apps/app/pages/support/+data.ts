import { logRouting } from "@/shared/lib/log";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { wrapTitle } from "@/shared/lib/utils";
import { useConfig } from "vike-react/useConfig";
import { type PageContext } from "vike/types";

const title = wrapTitle(`Поддержка`);
const previewImage = getStaticImage("arts/wide.jpg");

function metadata() {
	return {
		title,
		image: previewImage,
	};
}

export async function data(pageCtx: PageContext) {
	logRouting(pageCtx.urlPathname, "data");

	const config = useConfig();
	config(metadata());
};
