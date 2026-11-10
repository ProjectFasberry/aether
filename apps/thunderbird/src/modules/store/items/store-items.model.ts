import { general } from "#/shared/database/general-db";
import { metaSchema, searchQuerySchema, withMeta } from "#/shared/schemas";
import { getDirection } from "#/helpers/pagination";
import { toPageMeta } from "#/helpers/pagination";
import { parsePrice } from "#/modules/store/lib/pricing";
import { resolveStoreImageUrl } from "#/modules/store/lib/images";
import { GAME_CURRENCIES } from "@repo/shared/schemas/store/payment";
import { type Static, t } from "elysia";
import { sql, type Selectable } from "kysely";
import type { StoreItems } from "@gen/db/general";
import { executeWithCursorPagination } from "kysely-paginate";

const STORE_LIST_TYPE = ["all", "donate", "event"] as const;

export const storeListSchema = t.Composite([
  t.Pick(metaSchema, ["endCursor"]),
  t.Object({
    category: t.Transform(t.Optional(t.UnionEnum(STORE_LIST_TYPE, { default: "all" })))
      .Decode(v => v ?? "all")
      .Encode(v => v),
    wallet: t.Transform(t.UnionEnum([...GAME_CURRENCIES, "ALL"], { default: "ALL" }))
      .Decode(v => v ?? "ALL")
      .Encode(v => v),
    searchQuery: searchQuerySchema
  })
])

export const storeItemsItemSchema = t.Object({
  id: t.Number(),
  title: t.String(),
  description: t.Nullable(t.String()),
  imageUrl: t.String(),
  type: t.String(),
  value: t.String(),
  currency: t.String(),
  price: t.Number(),
  content: t.Any()
})

export const storeItemsSchema = t.Object({
  data: t.Array(
    storeItemsItemSchema
  ),
  meta: withMeta
})

export const store = {
  async getItem(id: number): Promise<Static<typeof storeItemsItemSchema> | null> {
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
        "content"
      ])
      .where("id", "=", id)
      .executeTakeFirst()

    if (!query) return null;

    const data = {
      ...query,
      imageUrl: resolveStoreImageUrl(query.imageUrl),
      price: parsePrice(query.currency, query.price),
    }

    return data
  },
  /**
   * Full row for the private edit form. Public routes must not expose
   * `command`/`refund_cmd`, so they use `getItem` instead.
   */
  async getItemForEdit(id: number): Promise<Selectable<StoreItems> | null> {
    return await general
      .selectFrom("store_items")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst() ?? null;
  },
  async getItems(
    { wallet, category, endCursor, searchQuery }: Static<typeof storeListSchema>
  ): Promise<Static<typeof storeItemsSchema>> {
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
      const imageUrl = resolveStoreImageUrl(item.imageUrl)

      const updated = {
        ...item,
        imageUrl,
        price: parsePrice(item.currency, item.price),
      }

      return updated
    })

    return {
      data,
      meta: toPageMeta(result)
    }
  }
}
