import Elysia, { t } from "elysia";
import { externalOrders, orderDefaultSingleSchema } from "./external-order.model";
import { withData } from "#/shared/schemas";

export const orderRoute = new Elysia()
  .get("/", async ({ params: { uniqueId } }) => {
    const data = await externalOrders.getSingle(uniqueId)
    return { data }
  }, {
    params: t.Object({
      uniqueId: t.String()
    }),
    response: {
      200: withData(
        t.Nullable(orderDefaultSingleSchema)
      )
    }
  })