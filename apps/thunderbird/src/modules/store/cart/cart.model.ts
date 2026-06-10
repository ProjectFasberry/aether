import { general } from "#/shared/database/general-db"
import { withMeta } from "#/shared/schemas";
import { definePrice, processImageUrl } from "#/utils/store/store-helpers"
import type { CartItem } from "@repo/shared/types/entities/store"
import { type Static, t } from "elysia";

export const editItemToBasketSchema = t.Object({
  key: t.UnionEnum(
    ["recipient", "selected"]
  ),
  value: t.Union(
    [t.String(), t.Boolean()]
  )
})

export const cartListItemSchema = t.Object({
  id: t.Number(),
  title: t.String(),
  description: t.Nullable(t.String()),
  imageUrl: t.String(),
  price: t.Number(),
  recipient: t.String(),
  selected: t.Boolean(),
  quantity: t.Number(),
  value: t.String(),
  type: t.String(),
  command: t.Nullable(t.String()),
  currency: t.String(),
})

export const cartPriceSchema = t.Object({
  CHARISM: t.Number(),
  BELKOIN: t.Number()
})

export const cartListSchema = t.Object({
  data: t.Array(cartListItemSchema),
  meta: withMeta
});

export const cartItem = {
  async validateInitiatorExists(initiator: string) {
    const initiatorIsExists = await general
      .selectFrom("players")
      .select("nickname")
      .where("nickname", "=", initiator)
      .executeTakeFirst();

    if (!initiatorIsExists) {
      return null;
    }

    return initiatorIsExists.nickname
  },
  async add(
    id: number,
    { initiator, recipient }: { initiator: string, recipient: string }
  ): Promise<number | null> {
    const existsQuery = await general
      .selectFrom("store_items")
      .select(eb => [
        "store_items.id",
        "store_items.price",
        eb.fn.countAll("store_items").as("count")
      ])
      .where("id", "=", id)
      .groupBy([
        "store_items.id",
        "store_items.price",
      ])
      .executeTakeFirst()

    if (!existsQuery?.count) {
      return null
    }

    const query = await general
      .insertInto("store_cart_items")
      .values({
        initiator,
        price_snapshot: existsQuery.price.toString(),
        product_id: existsQuery.id,
        quantity: 1,
        recipient
      })
      .returning("product_id")
      .executeTakeFirstOrThrow()

    return query.product_id
  },
  async delete(id: number, initiator: string) {
    const query = await general
      .deleteFrom("store_cart_items")
      .where("product_id", "=", id)
      .where("initiator", "=", initiator)
      .returning("id")
      .executeTakeFirstOrThrow()

    return query.id
  },
  async edit(
    initiator: string,
    { key, value, id }: Static<typeof editItemToBasketSchema> & { id: number },
  ): Promise<string | boolean> {
    const query = await general
      .updateTable("store_cart_items")
      .set({ [key]: value })
      .where("product_id", "=", id)
      .where("initiator", "=", initiator)
      .returning(key)
      .executeTakeFirstOrThrow()

    const data = query[key]
    return data
  },
  async getList(initiator: string) {
    const items = await general
      .selectFrom("store_cart_items")
      .innerJoin("store_items", "store_items.id", "store_cart_items.product_id")
      .select([
        "store_items.id",
        "store_items.currency",
        "store_items.title",
        "store_items.price",
        "store_items.type",
        "store_items.value",
        "store_cart_items.recipient"
      ])
      .where("store_cart_items.initiator", "=", initiator)
      .where("store_cart_items.selected", "=", true)
      .execute()

    return items;
  },
  async getData(initiator: string): Promise<CartItem[]> {
    const query = await general
      .selectFrom("store_cart_items")
      .innerJoin("store_items", "store_items.id", "store_cart_items.product_id")
      .select([
        "store_items.id",
        "store_items.title",
        "store_items.description",
        "store_items.command",
        "store_items.currency",
        "store_items.type",
        "store_items.imageUrl",
        "store_items.content",
        "store_items.value",
        "store_items.price",
        "store_cart_items.selected",
        "store_cart_items.recipient",
        "store_cart_items.quantity",
      ])
      .where("initiator", "=", initiator)
      .groupBy([
        "store_items.id",
        "store_items.title",
        "store_items.description",
        "store_items.command",
        "store_items.currency",
        "store_items.type",
        "store_items.content",
        "store_items.imageUrl",
        "store_items.value",
        "store_items.price",
        "store_cart_items.selected",
        "store_cart_items.recipient",
        "store_cart_items.quantity",
      ])
      .execute()

    const products = query.map((item) => ({
      ...item,
      imageUrl: processImageUrl(item.imageUrl),
      price: definePrice(item.currency, item.price)
    }))

    return products
  }
}