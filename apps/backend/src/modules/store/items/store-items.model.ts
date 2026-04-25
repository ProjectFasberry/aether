import { general } from "#/shared/database/general-db";
import { metaSchema, searchQuerySchema } from "#/shared/schemas";
import { getDirection } from "#/utils/config/paginate";
import { wrapMeta } from "#/utils/config/transforms";
import { definePrice, processImageUrl } from "#/utils/store/store-helpers";
import { GAME_CURRENCIES } from "@repo/shared/schemas/payment";
import type { StoreItem, StoreItemsPayload } from "@repo/shared/types/entities/store";
import { sql } from "kysely";
import { executeWithCursorPagination } from "kysely-paginate";
import * as z from "zod/v4";

const STORE_LIST_TYPE = ["all", "donate", "event"] as const;

export const storeListSchema = z.intersection(
  metaSchema.pick({ endCursor: true }),
  z.object({
    category: z.enum(STORE_LIST_TYPE).optional().default("all"),
    wallet: z.enum([...GAME_CURRENCIES, "ALL"]).default("ALL"),
    searchQuery: searchQuerySchema
  })
)

export const store = {
  async getItem(id: number): Promise<StoreItem | null> {
    const query = await general
      .selectFrom("store_items")
      .select([
        "id",
        "title",
        "description",
        "price",
        "imageUrl",
        "type",
        "value",
        "currency",
        "command",
        "content"
      ])
      .where("id", "=", id)
      .executeTakeFirst()

    if (!query) return null;

    const data = {
      ...query,
      imageUrl: processImageUrl(query.imageUrl),
      price: definePrice(query.currency, query.price),
    }

    return data
  },
  async getItems(
    { wallet, category, endCursor, searchQuery }: z.infer<typeof storeListSchema>
  ): Promise<StoreItemsPayload> {
    let storeQuery = general
      .selectFrom("store_items")
      .select([
        "id",
        "title",
        "price",
        "description",
        "imageUrl",
        "type",
        "currency",
        "command",
        "value",
        "content"
      ])
      .orderBy("id", "asc")

    if (searchQuery && searchQuery.trim().length >= 1) {
      if (searchQuery.length < 2) {
        const firstLetter = searchQuery[0]

        storeQuery = storeQuery
          .where('title', 'ilike', `${firstLetter}%`)
          .orderBy(sql<number>`similarity(title, ${searchQuery}) DESC`)
      } else {
        storeQuery = storeQuery
          .where(sql<boolean>`similarity(title, ${searchQuery}) > 0.2`)
          .orderBy(sql<number>`similarity(title, ${searchQuery})`, 'desc')
      }
    }

    if (wallet !== 'ALL') {
      storeQuery = storeQuery.where('currency', "=", wallet)
    }

    const queryType = STORE_LIST_TYPE.includes(category) ? category : "all"

    if (queryType === 'all') {
      storeQuery = storeQuery.where("type", "in", STORE_LIST_TYPE)
    } else {
      storeQuery = storeQuery.where("type", "=", queryType)
    }

    const direction = getDirection(true)

    const result = await executeWithCursorPagination(storeQuery, {
      after: endCursor,
      perPage: 32,
      fields: [
        { key: "id", expression: "id", direction }
      ],
      parseCursor: (cursor) => ({
        id: Number(cursor.id)
      })
    })

    const data = result.rows.map((item) => {
      const imageUrl = processImageUrl(item.imageUrl)

      const updated = {
        ...item,
        imageUrl,
        price: definePrice(item.currency, item.price),
      }

      return updated
    })

    return {
      data,
      meta: wrapMeta(result)
    }
  }

}