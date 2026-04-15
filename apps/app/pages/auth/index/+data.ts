import { logRouting } from "@/shared/lib/log";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { wrapTitle } from "@/shared/lib/wrap-title";
import { useConfig } from "vike-react/useConfig";
import { PageContext } from "vike/types";

const title = wrapTitle(`Авторизация`);
const previewImage = getStaticImage("arts/wide.jpg");

function metadata() {
	return {
		title,
		description: "Присоединитесь к лучшему проекту майнкрафта",
		image: previewImage,
	};
}

export const data = async (pageContext: PageContext) => {
	logRouting(pageContext.urlPathname, "data");

	const config = useConfig();

	config(metadata());
};
