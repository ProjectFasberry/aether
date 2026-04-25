import Elysia, { t } from "elysia";
import * as z from "zod/v4";
import { defineGlobalPrice } from "#/utils/store/store-helpers";
import { cartItem, cartListPayload, cartPricePayload, editItemToBasketSchema } from "./cart.model";
import { wrapError } from "#/helpers/wrap-error";
import { withData, withError } from "#/shared/schemas";
import { defineUser } from "#/lib/middlewares/define";

const itemBasketBaseSchema = z.object({
  id: z.coerce.number()
})

const basketAddItem = new Elysia()
  .use(defineUser())
  .post("/add/:id", async ({ status, nickname: initiator, body: { recipient }, params: { id } }) => {
    const validateResult = await cartItem.validateInitiatorExists(recipient)

    if (!validateResult) {
      return status(400, wrapError("RECIPIENT_NOT_FOUND"))
    }

    const data = await cartItem.add(id, { initiator, recipient });
    if (!data) {
      return status(404, wrapError("ITEM_NOT_FOUND"))
    }

    return { data }
  }, {
    params: itemBasketBaseSchema,
    body: t.Object({
      recipient: t.String({ minLength: 1 })
    }),
    response: {
      200: withData(
        t.Nullable(t.Number())
      ),
      400: withError,
      404: withError
    }
  })

const basketRemoveItem = new Elysia()
  .use(defineUser())
  .delete("/remove/:id", async ({ nickname: initiator, params: { id } }) => {
    const data = await cartItem.delete(id, initiator)
    return { data }
  }, {
    params: itemBasketBaseSchema,
    response: {
      200: withData(
        t.Number()
      )
    }
  })

const basketEditItem = new Elysia()
  .use(defineUser())
  .post("/edit/:id", async ({ nickname: initiator, body, params: { id } }) => {
    const data = await cartItem.edit(initiator, { ...body, id })
    return { data }
  }, {
    body: editItemToBasketSchema,
    params: itemBasketBaseSchema,
    response: {
      200: withData(
        t.Union([
          t.String(), t.Boolean()
        ])
      )
    }
  })

const basketPrice = new Elysia()
  .use(defineUser())
  .get("/price", async ({ nickname: initiator }) => {
    const data = await defineGlobalPrice(initiator);
    return { data }
  }, {
    response: {
      200: withData(cartPricePayload)
    }
  })

const basketList = new Elysia()
  .use(defineUser())
  .get("/list", async ({ nickname: initiator }) => {
    const data = await cartItem.getData(initiator)
    return {
      data: {
        data,
        meta: {
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    }
  }, {
    response: {
      200: withData(cartListPayload)
    }
  })

export const cart = new Elysia()
  .group("/cart", app => app
    .use(basketList)
    .use(basketPrice)
    .use(basketAddItem)
    .use(basketRemoveItem)
    .use(basketEditItem)
  )