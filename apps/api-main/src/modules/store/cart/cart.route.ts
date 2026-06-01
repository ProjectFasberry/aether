import Elysia, { t } from "elysia";
import { defineGlobalPrice } from "#/utils/store/store-helpers";
import { cartItem, cartListSchema, cartPriceSchema, editItemToBasketSchema } from "./cart.model";
import { wrapError } from "#/utils";
import { withData, withError } from "#/shared/schemas";
import { defineRequiredUser } from "#/lib/define";

const cartAddItem = new Elysia()
  .use(defineRequiredUser())
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
    params: t.Object({
      id: t.Number()
    }),
    body: t.Object({
      recipient: t.String({ minLength: 1 })
    }),
    response: {
      200: withData(
        t.Number()
      ),
      400: withError(
        t.UnionEnum([
          "RECIPIENT_NOT_FOUND"
        ])
      ),
      404: withError(
        t.UnionEnum([
          "ITEM_NOT_FOUND"
        ])
      )
    }
  })

const cartRemoveItem = new Elysia()
  .use(defineRequiredUser())
  .delete("/remove/:id", async ({ nickname: initiator, params: { id } }) => {
    const data = await cartItem.delete(id, initiator)
    return { data }
  }, {
    params: t.Object({
      id: t.Number()
    }),
    response: {
      200: withData(
        t.Number()
      )
    }
  })

const cartEditItem = new Elysia()
  .use(defineRequiredUser())
  .post("/edit/:id", async ({ nickname: initiator, body, params: { id } }) => {
    const data = await cartItem.edit(initiator, { ...body, id })
    return { data }
  }, {
    body: editItemToBasketSchema,
    params: t.Object({
      id: t.Number()
    }),
    response: {
      200: withData(
        t.Union([
          t.String(), t.Boolean()
        ])
      )
    }
  })

const cartPrice = new Elysia()
  .use(defineRequiredUser())
  .get("/price", async ({ nickname: initiator }) => {
    const data = await defineGlobalPrice(initiator);
    return { data }
  }, {
    response: {
      200: withData(cartPriceSchema)
    }
  })

const cartList = new Elysia()
  .use(defineRequiredUser())
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
      200: withData(cartListSchema)
    }
  })

export const cart = new Elysia()
  .group("/cart", app => app
    .use(cartList)
    .use(cartPrice)
    .use(cartAddItem)
    .use(cartRemoveItem)
    .use(cartEditItem)
  )
