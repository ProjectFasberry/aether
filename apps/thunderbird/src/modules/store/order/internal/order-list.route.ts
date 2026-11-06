import { defineRequiredUser } from "#/lib/define";
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "@repo/shared/lib/helpers";
import Elysia, { t } from "elysia";
import { buildRouteSummary } from "#/utils";
import { internalOrders, orderGameSchema, orderSingleGameSchema } from "./internal-order.model";

export const ordersList = new Elysia()
  .use(defineRequiredUser())
  .get("/list", async ({ nickname }) => {
    const data = await internalOrders.getGameOrders({ initiator: nickname });
    return { data };
  }, {
    response: {
      200: withData(t.Array(orderGameSchema)),
    },
    detail: {
      summary: buildRouteSummary("List game orders"),
    },
  })
  .get("/:id", async ({ nickname, params, status }) => {
    const data = await internalOrders.getGameOrder(params.id);

    if (!data || data.initiator !== nickname) return status(404, wrapError("ORDER_NOT_FOUND"));

    return { data };
  }, {
    params: t.Object({ id: t.String({ minLength: 1, maxLength: 64 }) }),
    response: {
      200: withData(orderSingleGameSchema),
      404: withError(),
    },
    detail: {
      summary: buildRouteSummary("Get a game order"),
    },
  });
