import Elysia, { t } from "elysia"
import { externalOrders, orderDefaultSingleSchema, orderStatusSchema } from "./external-order.model"
import { defineUser } from "#/lib/middlewares/define"
import { withData } from "#/shared/schemas"

export const ordersList = new Elysia()
  .use(defineUser())
  .get("/list", async ({ nickname: initiator, query: { status = "all" } }) => {
    const data = await externalOrders.getAllOrders({ initiator, status })
    return { data }
  }, {
    query: t.Optional(
      t.Object({
        status: orderStatusSchema,
      })
    ),
    response: {
      200: withData(
        t.Array(orderDefaultSingleSchema)
      )
    }
  })