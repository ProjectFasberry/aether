import { general } from "#/shared/database/general-db";
import Elysia from "elysia";

export const appLibrary = new Elysia().get("/library", async () => {
	const list = await general
		.selectFrom("library_backgrounds")
		.select((eb) => ["title", "created_at", "title"])
		.execute();

	const data = { list };

	return {
		data,
	};
});
