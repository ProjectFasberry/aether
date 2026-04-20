import Elysia, { t } from "elysia";
import { defineUser } from "#/lib/middlewares/define";
import { withData } from "#/shared/schemas";
import { balanceSchema, getBalance } from "./balance.model";

const balancePayload = t.Object({
  CHARISM: t.Number(),
  BELKOIN: t.Number()
})

export const balance = new Elysia()
  .use(defineUser())
  .get("/balance", async ({ nickname, query }) => {
    const data = await getBalance(nickname, query)
    return { data }
  }, {
    response: {
      200: withData(balancePayload)
    },
    query: balanceSchema
  })