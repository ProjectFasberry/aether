import { invariant } from "#/helpers/invariant";
import { general } from "#/shared/database/general-db"
import { metaSchema } from "#/shared/schemas";
import { getDirection } from "#/utils/config/paginate";
import { wrapMeta } from "#/utils/config/transforms";
import { type Static, t } from "elysia";
import { executeWithCursorPagination } from "kysely-paginate";
import * as z from "zod/v4"

export type ChatItem = {
  id: number;
  created_at: Date;
  edited: boolean;
  edited_at: Date | null;
  message: string;
  nickname: string;
  views: number
}

export type ChatEventVariant = "create" | "delete" | "edit"

export type ChatEvent<T> = {
  event: ChatEventVariant,
  data: T
}

export const chatCreateMessageSchema = z.object({
  message: z.string().min(1).max(2025)
})

export const chatDeleteMessageSchema = z.object({
  id: z.coerce.number()
})

export const chatEditMessageSchema = z.object({
  id: z.coerce.number(),
  message: z.string().min(1).max(2025)
})

export const chatDataSchema = t.Pick(metaSchema, ["asc", "endCursor"])
export const chatMessageViewsSchema = t.Pick(metaSchema, ["endCursor"])

export const chat = {
  async getHistory({ asc, endCursor, nickname }: Static<typeof chatDataSchema> & { nickname: string }) {
    const baseQuery = general
      .selectFrom("privated_chat")
      .leftJoin("chat_views", "chat_views.message_id", "privated_chat.id")
      .select(eb => [
        "privated_chat.id",
        "privated_chat.created_at",
        "privated_chat.edited_at",
        "privated_chat.edited",
        "privated_chat.nickname",
        "privated_chat.message",
        eb.fn.coalesce(eb.fn.count('chat_views.id'), eb.val(0)).as('views'),
      ])
      .groupBy([
        "privated_chat.id",
        "privated_chat.created_at",
        "privated_chat.edited_at",
        "privated_chat.edited",
        "privated_chat.nickname",
        "privated_chat.message",
      ])

    const direction = getDirection(asc)

    const result = await executeWithCursorPagination(baseQuery, {
      perPage: 32,
      after: endCursor,
      fields: [
        { expression: "privated_chat.created_at", direction }
      ],
      parseCursor: (cursor) => ({
        created_at: new Date(cursor.created_at)
      })
    })

    const data: { data: ChatItem[], meta: PaginatedMeta } = {
      // @ts-expect-error
      data: result.rows,
      meta: wrapMeta(result)
    }

    const acc = data.data.map((d => ({
      nickname,
      message_id: d.id
    })))

    await general
      .insertInto("chat_views")
      .values(acc)
      .onConflict((oc) => oc.columns(["nickname", "message_id"]).doNothing())
      .execute()

    return data
  },
  async createMsg(nickname: string, message: string) {
    return general
      .insertInto("privated_chat")
      .values({ message, nickname })
      .returningAll()
      .executeTakeFirstOrThrow()
  },
  async editMsg(nickname: string, id: number, newMessage: string) {
    return general
      .updateTable('privated_chat')
      .set({
        message: newMessage,
        edited: true,
        edited_at: new Date().toISOString()
      })
      .where("id", "=", id)
      .where("nickname", "=", nickname)
      .returningAll()
      .executeTakeFirstOrThrow()
  },
  async deleteMsg(nickname: string, id: number) {
    const query = await general
      .deleteFrom('privated_chat')
      .where("id", "=", id)
      .where("nickname", "=", nickname)
      .executeTakeFirstOrThrow()

    invariant(query.numDeletedRows, 'Not deleted')

    return query;
  },
  async getViews(id: number, { endCursor }: Static<typeof chatMessageViewsSchema>) {
    const views = await general
      .selectFrom("chat_views")
      .select("id")
      .where("message_id", "=", id)
      .limit(64)
      .execute();

    if (views.length >= 64) {
      return { data: views, meta: wrapMeta({ hasNextPage: false, hasPrevPage: false }) }
    }

    const baseQuery = general
      .selectFrom("chat_views")
      .select([
        "id",
        "nickname",
        "message_id",
        "created_at"
      ])
      .where("message_id", "=", id)

    const result = await executeWithCursorPagination(baseQuery, {
      after: endCursor,
      perPage: 32,
      fields: [
        { expression: "created_at", direction: "asc" }
      ],
      parseCursor: (cursor) => ({
        created_at: new Date(cursor.created_at)
      })
    })

    const data = {
      data: result.rows,
      meta: wrapMeta(result)
    }

    return data;
  }
}