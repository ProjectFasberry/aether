import { general } from "#/shared/database/general-db"
import { definePrice, processImageUrl } from "#/utils/store/store-helpers"
import type { CartItem } from "@repo/shared/types/entities/store"
import * as z from "zod/v4"

export async function getBasketData(initiator: string): Promise<CartItem[]> {
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

export async function validateInitiatorExists(initiator: string) {
  const initiatorIsExists = await general
    .selectFrom("players")
    .select("nickname")
    .where("nickname", "=", initiator)
    .executeTakeFirst();

  if (!initiatorIsExists) {
    return null;
  }

  return initiatorIsExists.nickname
}

export async function addItemToBasket(id: number, { initiator, recipient }: { initiator: string, recipient: string }) {
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
    throw new Error("Item not found")
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
    .executeTakeFirst()

  return Boolean(query?.product_id)
}

export async function removeItemFromCart(id: number, initiator: string) {
  const query = await general
    .deleteFrom("store_cart_items")
    .where("product_id", "=", id)
    .where("initiator", "=", initiator)
    .returning("id")
    .executeTakeFirst()

  return Boolean(query?.id)
}

const editItemValues = [z.string(), z.boolean()];

export const editItemToBasketSchema = z.object({
  id: z.coerce.number(),
  key: z.enum(["recipient", "selected"]),
  value: z.union(editItemValues)
})

export async function editItemInCart(
  { key, value, id }: z.infer<typeof editItemToBasketSchema>,
  initiator: string
) {
  const query = await general
    .updateTable("store_cart_items")
    .set({ [key]: value })
    .where("product_id", "=", id)
    .where("initiator", "=", initiator)
    .returning(key)
    .executeTakeFirstOrThrow()

  const data = query[key]

  return data
}

export async function getCartSelectedItems(initiator: string) {
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
}