import { normalizeIp } from "#/helpers/normalize-ip";
import { getUrl } from "#/helpers/volume";
import { general } from "#/shared/database/general-db";
import { metaSchema, searchQuerySchema, createStringBoolSchema, withMeta } from "#/shared/schemas";
import { getDirection } from "#/utils/config/paginate";
import { wrapMeta } from "#/utils/config/transforms";
import { DEFAULT_HEAD } from "@repo/core/modules/skins";
import type { DB } from "@repo/shared/types/db/general";
import { type Static, t } from "elysia";
import type { ReferenceExpression, SelectExpression } from "kysely";
import { executeWithCursorPagination } from "kysely-paginate";
import { skinsService } from "../server/skin/index.model";
import { env } from "#/shared/env";
import { DateTime } from "#/helpers/typebox";

export const newsSingleSchema = t.Object({
	id: t.Number(),
	title: t.String(),
	created_at: DateTime,
	description: t.String(),
	imageUrl: t.String(),
	views: t.Number(),
	creator: t.Object({
		nickname: t.String(),
		avatar: t.String(),
	}),
	content: t.Optional(t.Any()),
});

export const newsPayloadSchema = t.Object({
	data: t.Array(newsSingleSchema),
	meta: withMeta,
});

export const getNewsListSchema = t.Composite([
	t.Pick(metaSchema, ["asc", "endCursor", "limit"]),
	t.Partial(
		t.Object({
			searchQuery: searchQuerySchema,
			content: createStringBoolSchema(true),
		}),
	),
]);

export async function createNewsViews(target: { ids: number[]; ip: string | null }) {
	if (target.ids.length === 0) return;

	const normalizedIp = normalizeIp(target.ip);
	if (!normalizedIp) return;

	const data = target.ids.map((id) => ({
		news_id: id,
		initiator: normalizedIp,
	}));

	general
		.insertInto("news_views")
		.values(data)
		.onConflict((oc) => oc.constraint("news_views_news_id_initiator_uniq").doNothing())
		.execute();
}

export async function getNewsList({
	asc,
	limit,
	endCursor,
	searchQuery,
	content,
}: Static<typeof getNewsListSchema>): Promise<Static<typeof newsPayloadSchema> | null> {
	const fields: SelectExpression<DB, "news" | "news_views">[] = [
		"news.id",
		"news.created_at",
		"news.title",
		"news.description",
		"news.imageUrl",
		"news.creator",
	];

	const grouped: ReferenceExpression<DB, "news" | "news_views">[] = [
		"news.id",
		"news.created_at",
		"news.title",
		"news.description",
		"news.imageUrl",
		"news.creator",
	];

	if (content) {
		fields.push("news.content");
		grouped.push("news.content");
	}

	let query = general
		.selectFrom("news")
		.leftJoin("news_views", "news_views.news_id", "news.id")
		.select((eb) => [...fields, eb.fn.countAll().as("views")])
		.groupBy(grouped);

	if (searchQuery) {
		query = query.where("title", "like", `%${searchQuery}%`);
	}

	const direction = getDirection(asc);

	const res = await executeWithCursorPagination(query, {
		perPage: limit,
		after: endCursor,
		fields: [{ key: "created_at", expression: "created_at", direction }],
		parseCursor: (cursor) => ({
			created_at: new Date(cursor.created_at),
		}),
	});

	const data = res.rows.map((news) => ({
		...news,
		id: news.id!,
		views: Number(news.views),
		created_at: news.created_at,
		creator: {
			nickname: news.creator,
			avatar: DEFAULT_HEAD(env.VOLUME_URL),
		},
		imageUrl: getUrl(news.imageUrl),
	}));

	return {
		data,
		meta: wrapMeta(res),
	};
}

export async function getNewsSingle(id: number): Promise<Static<typeof newsSingleSchema> | null> {
	const query = await general
		.selectFrom("news")
		.leftJoin("news_views", "news_views.news_id", "news.id")
		.select((eb) => [
			"news.id",
			"news.created_at",
			"news.title",
			"news.description",
			"news.imageUrl",
			"news.creator as newsCreator",
			"news.content",
			eb.fn.count("news_views.id").as("views"),
		])
		.groupBy([
			"news.id",
			"news.created_at",
			"news.title",
			"news.description",
			"news.imageUrl",
			"news.creator",
			"news.content",
		])
		.where("news.id", "=", id)
		.limit(1)
		.executeTakeFirst();

	if (!query) return null;

	const { newsCreator, ...base } = query;

	const creator = {
		nickname: newsCreator,
		avatar: await skinsService.player.getAvatar(newsCreator),
	};

	return {
		...base,
		views: Number(query.views),
		creator,
		imageUrl: getUrl(query.imageUrl),
	};
}
