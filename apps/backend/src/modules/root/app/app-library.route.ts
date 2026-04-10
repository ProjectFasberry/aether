import { getStaticUrl } from "#/helpers/volume";
import { general } from "#/shared/database/general-db";
import Elysia from "elysia";

export const appLibrary = new Elysia().get("/library", async () => {
	const list = await general
		.selectFrom("library_backgrounds")
		.select((eb) => ["id", "title", "created_at", "url"])
		.execute();

	const data = { list: list.map((d) => ({ ...d, url: getStaticUrl(d.url) })) };

	return {
		data,
	};
});
