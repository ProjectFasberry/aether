import Elysia, { t } from "elysia";
import * as z from "zod/v4";
import { defineGlobalPrice } from "#/utils/store/store-helpers";
import type { CartPayload } from "@repo/shared/types/entities/store";
import { addItemToBasket, editItemInCart, editItemToBasketSchema, getBasketData, removeItemFromCart, validateInitiatorExists } from "./cart.model";
import { wrapError } from "#/helpers/wrap-error";
import { withData } from "#/shared/schemas";
import { defineUser } from "#/lib/middlewares/define";

const itemBasketBaseSchema = z.object({
  id: z.coerce.number(),
})

const itemBasketAddSchema = z.intersection(
  itemBasketBaseSchema,
  z.object({
    recipient: z.string().min(1)
  })
)

const basketAddItem = new Elysia()
  .use(defineUser())
  .post("/add", async ({ status, nickname: initiator, body }) => {
    const { id, recipient } = body;
    const validateResult = await validateInitiatorExists(recipient)

    if (!validateResult) {
      return status(400, wrapError("Recipient not found"))
    }

    const data = await addItemToBasket(id, { initiator, recipient });
    return { data }
  }, {
    body: itemBasketAddSchema
  })

const basketRemoveItem = new Elysia()
  .use(defineUser())
  .delete("/remove", async ({ nickname: initiator, body }) => {
    const { id } = body;
    const data = await removeItemFromCart(id, initiator)
    return { data }
  }, {
    body: itemBasketBaseSchema
  })

const basketEditItem = new Elysia()
  .use(defineUser())
  .post("/edit", async ({ nickname: initiator, body }) => {
    const data = await editItemInCart(body, initiator)
    return { data }
  }, {
    body: editItemToBasketSchema
  })

const cartListPayload = t.Object({
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

const cartPricePayload = t.Object({
  CHARISM: t.Number(),
  BELKOIN: t.Number()
})

const basketList = new Elysia()
  .use(defineUser())
  .model({
    "cart-list": withData(
      t.Object({
        products: t.Array(cartListPayload),
        price: cartPricePayload
      })
    )
  })
  .get("/list", async ({ nickname: initiator }) => {
    const [products, price] = await Promise.all([
      getBasketData(initiator),
      defineGlobalPrice(initiator)
    ])

    const data: CartPayload = { products, price }

    return { data }
  }, {
    response: {
      200: "cart-list"
    }
  })

export const cart = new Elysia()
  .group("/cart", app => app
    .use(basketList)
    .use(basketAddItem)
    .use(basketRemoveItem)
    .use(basketEditItem)
  )