import { general } from "#/shared/database/general-db";
import { metaSchema, withMeta } from "#/shared/schemas";
import { getDirection } from "#/utils/config/paginate";
import { wrapMeta } from "#/utils/config/transforms";
import { type Static, t } from "elysia";
import { executeWithCursorPagination } from "kysely-paginate";

export async function bannerExists(nickname: string) {
	const result = await general
		.selectFrom("banners as b")
		.select((eb) => [
			eb
				.exists(
					eb
						.selectFrom("banners_views as bv")
						.select("bv.banner_id")
						.whereRef("bv.banner_id", "=", "b.id")
						.where("bv.nickname", "=", nickname),
				)
				.as("viewed"),
		])
		.orderBy("b.created_at", "desc")
		.limit(1)
		.executeTakeFirst();

	if (!result) return false;

	return !result.viewed;
}

export const bannerSoloSchema = t.Pick(metaSchema, ["asc"]);

export const bannerSchema = t.Object({
	id: t.Number(),
});

export const getBannersListSchema = t.Composite([
	t.Pick(metaSchema, ["asc", "endCursor"]),
	t.Object({
		searchQuery: t.Optional(t.String({ minLength: 1, maxLength: 256 })),
	}),
]);

export const bannerSingleSchema = t.Object({
	id: t.Number(),
	title: t.String(),
	description: t.Union([t.String(), t.Null()]),
	href: t.Object({
		title: t.String(),
		value: t.String(),
	}),
});

export const bannersSchema = t.Object({
	data: t.Array(bannerSingleSchema),
	meta: withMeta,
});

export async function getBanners({
	asc,
	endCursor,
	searchQuery,
}: Static<typeof getBannersListSchema>): Promise<Static<typeof bannersSchema>> {
	const direction = getDirection(asc);

	let query = general
		.selectFrom("banners")
		.select(["id", "created_at", "title", "description", "href_title", "href_value"]);

	if (searchQuery) {
		query = query.where("title", "like", `%${searchQuery}%`);
	}

	const result = await executeWithCursorPagination(query, {
		perPage: 16,
		after: endCursor,
		fields: [{ key: "created_at", expression: "created_at", direction }],
		parseCursor: (cursor) => ({
			created_at: new Date(cursor.created_at),
		}),
	});

	const data = {
		data: result.rows.map((banner) => ({ ...banner, href: { title: banner.href_title, value: banner.href_value } })),
		meta: wrapMeta(result),
	};

	return data;
}
