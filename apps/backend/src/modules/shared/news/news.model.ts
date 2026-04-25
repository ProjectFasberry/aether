import { normalizeIp } from "#/helpers/normalize-ip";
import { getStaticUrl } from "#/helpers/volume";
import { DEFAULT_HEAD, getPlayerAvatar } from "#/modules/server/skin/skin.model";
import { general } from "#/shared/database/general-db";
import { metaSchema, searchQuerySchema } from "#/shared/schemas";
import { getDirection } from "#/utils/config/paginate";
import { wrapMeta } from "#/utils/config/transforms";
import type { News, NewsPayload } from "@repo/shared/types/entities/news";
import { executeWithCursorPagination } from "kysely-paginate";
import * as z from "zod/v4";

export const newsSchema = z.intersection(
  metaSchema.pick({ asc: true, endCursor: true, limit: true }),
  z.object({
    searchQuery: searchQuerySchema,
    content: z.stringbool().optional().default(false)
  })
)

export async function createNewsViews(target: { ids: number[], ip: string | null }) {
  if (target.ids.length === 0) return;

  const normalizedIp = normalizeIp(target.ip)
  if (!normalizedIp) return;

  const data = target.ids.map((id) => ({
    news_id: id,
    initiator: normalizedIp
  }))

  general
    .insertInto("news_views")
    .values(data)
    .onConflict((oc) =>
      oc.constraint("news_views_news_id_initiator_uniq").doNothing()
    )
    .execute()
}

export async function getNewsList({ 
  asc, limit, endCursor, searchQuery, content 
}: z.infer<typeof newsSchema>) {
  let query = general
    .selectFrom('news')
    .leftJoin('news_views', 'news_views.news_id', 'news.id')
    .select(eb => [
      'news.id',
      'news.created_at',
      'news.title',
      'news.description',
      'news.imageUrl',
      'news.content',
      'news.creator',
      eb.fn.countAll().as('views')
    ])
    .groupBy([
      'news.id',
      'news.created_at',
      'news.title',
      'news.description',
      'news.imageUrl',
      'news.content',
      'news.creator'
    ])
  
  if (searchQuery) {
    query = query.where("title", "like", `%${searchQuery}%`)
  }

  const direction = getDirection(asc)

  const res = await executeWithCursorPagination(query, {
    perPage: limit,
    after: endCursor,
    fields: [
      { key: "created_at", expression: "created_at", direction }
    ],
    parseCursor: (cursor) => ({
      created_at: new Date(cursor.created_at)
    })
  })

  const data = res.rows.map((news) => ({
    ...news,
    views: Number(news.views),
    creator: {
      nickname: news.creator,
      avatar: getStaticUrl(DEFAULT_HEAD)
    },
    imageUrl: getStaticUrl(news.imageUrl)
  }))

  const response: NewsPayload = {
    data,
    meta: wrapMeta(res)
  }

  return response
}

export async function getNewsSingle(id: number): Promise<News | null> {
  const query = await general
    .selectFrom("news")
    .leftJoin('news_views', 'news_views.news_id', 'news.id')
    .select(eb => [
      'news.id',
      'news.created_at',
      'news.title',
      'news.description',
      'news.imageUrl',
      'news.creator as newsCreator',
      'news.content',
      eb.fn.count('news_views.id').as('views')
    ])
    .groupBy([
      'news.id',
      'news.created_at',
      'news.title',
      'news.description',
      'news.imageUrl',
      'news.creator',
      'news.content'
    ])
    .where("news.id", "=", id)
    .limit(1)
    .executeTakeFirst()

  if (!query) return null;

  const { newsCreator, ...base } = query;

  const creator = {
    nickname: newsCreator,
    avatar: await getPlayerAvatar(newsCreator)
  }

  const item = {
    ...base,
    views: Number(query.views),
    creator,
    imageUrl: getStaticUrl(query.imageUrl)
  }

  return item
}