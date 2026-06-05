import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia";
import { banner, bannerSchema, editBannerSchema } from "./banner.model";

export const bannerEdit = new Elysia()
	.post("/:id/edit", async ({ params: { id }, body }) => {
		const data = await banner.edit(id, body);
		return { data };
	}, {
		body: editBannerSchema,
		params: t.Object({
			id: t.Number()
		}),
		response: {
			200: withData(bannerSchema)
		}
	});
