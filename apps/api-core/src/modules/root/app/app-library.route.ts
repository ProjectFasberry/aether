import { getStaticUrl } from "#/helpers/volume";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import Elysia, { t } from "elysia";

export const appLibrary = new Elysia()
	.get("/library", async () => {
		const list = await general
			.selectFrom("library_backgrounds")
			.select((eb) => ["id", "title", "created_at", "url"])
			.execute();

		const data = { list: list.map((d) => ({ ...d, url: getStaticUrl(d.url) })) };

		return { data };
	}, {
		response: {
			200: withData(
				t.Object({
					list: t.Array(
						t.Object({
							url: t.String(),
							created_at: t.Union([t.String(), t.Date()]),
							id: t.Number(),
							title: t.Nullable(t.String())
						})
					)
				})
			)
    },
		detail: {
			summary: buildRouteSummary("Get app library")
		}
	});
