import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia";
import { banner, bannerEditSchema } from "./banner.model";

export const bannerEdit = new Elysia()
	.post("/:id/edit", async ({ params: { id }, body }) => {
		const data = await banner.edit(id, body);
		return { data };
	}, {
		body: bannerEditSchema,
		params: t.Object({
			id: t.Number()
		}),
		response: {
			200: withData(
				t.Object({
					title: t.String(),
					description: t.Nullable(t.String())
				})
			)
		}
	});