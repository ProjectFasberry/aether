import { defineUser } from "#/lib/define";
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia";
import { orderGameSchema } from "./internal-order.model";

export const ordersList = new Elysia()
  .use(defineUser())
  .get("/list", async (ctx) => {
    return { data: null }
  }, {
    response: {
      200: withData(
        t.Nullable(t.Array(orderGameSchema))
      )
    }
  })