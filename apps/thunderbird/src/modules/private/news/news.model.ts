import { getStaticUrl } from "#/helpers/volume";
import { newsSingleSchema } from "#/modules/news/news.model";
import { skinsService } from "#/shared/services/skins";
import { general } from "#/shared/database/general-db";
import { buildUpdates } from "#/utils/config/transforms";
import type { createNewsSchema, newsUpdateSchema } from "@repo/shared/schemas/news";
import type { DB } from "@repo/shared/types/db/general";
import { type Static, t } from "elysia";
import type { Selectable } from "kysely";
import type * as z from "zod";

export async function deleteNews(id: number) {
  return await general
    .deleteFrom("news")
    .where("id", "=", id)
    .returning(["id"])
    .executeTakeFirstOrThrow();
}

export const newsSingleExtendedSchema = t.Pick(newsSingleSchema, [
	"id",
	"imageUrl",
	"created_at",
	"title",
	"description",
	"content",
	"creator",
]);

export async function updateNews(
	id: number,
	values: z.infer<typeof newsUpdateSchema>,
): Promise<Static<typeof newsSingleExtendedSchema>> {
	const updates = buildUpdates<Selectable<DB["news"]>>(values);

	const query = await general
		.updateTable("news")
		.set(updates)
		.where("id", "=", id)
		.returningAll()
		.executeTakeFirstOrThrow();

	return {
		...query,
		created_at: query.created_at,
		creator: {
			nickname: query.creator,
			avatar: await skinsService.player.getAvatar(query.creator),
		},
	};
}

export async function createNews(
	{ title, description, content, imageUrl }: z.infer<typeof createNewsSchema>,
	creator: string,
): Promise<Static<typeof newsSingleExtendedSchema>> {
	const query = await general
		.insertInto("news")
		.values({ title, description, imageUrl, content, creator })
		.returningAll()
		.executeTakeFirstOrThrow();

	return {
		...query,
		created_at: query.created_at,
		imageUrl: getStaticUrl(query.imageUrl),
		creator: {
			nickname: query.creator,
			avatar: await skinsService.player.getAvatar(query.creator),
		},
	};
}
