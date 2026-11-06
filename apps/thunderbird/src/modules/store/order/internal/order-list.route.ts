import { defineRequiredUser } from "#/lib/define";
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "@repo/shared/lib/helpers";
import Elysia, { t } from "elysia";
import { buildRouteSummary } from "#/utils";
import {
  ORDER_DIRECTIONS,
  ORDER_SORTS,
  decodeGameOrderCursor,
  internalOrders,
  orderGameSchema,
  orderSingleGameSchema,
} from "./internal-order.model";

export const ordersList = new Elysia()
  .use(defineRequiredUser())
  .get("/list", async ({ nickname, query, status }) => {
    const cursor = query.endCursor ? decodeGameOrderCursor(query.endCursor) : null;
    if (query.endCursor && !cursor) return status(400, wrapError("INVALID_CURSOR"));

    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 50);
    const data = await internalOrders.getGameOrders({
      initiator: nickname,
      sort: query.sort ?? "date",
      order: query.order ?? "desc",
      status: query.status,
      cursor,
      limit,
    });

    return { data };
  }, {
    query: t.Object({
      sort: t.Optional(t.UnionEnum(ORDER_SORTS)),
      order: t.Optional(t.UnionEnum(ORDER_DIRECTIONS)),
      status: t.Optional(t.UnionEnum(["pending", "succeeded", "refunded"])),
      limit: t.Optional(t.String({ maxLength: 2 })),
      endCursor: t.Optional(t.String({ maxLength: 512 })),
    }),
    response: {
      200: withData(t.Object({
        data: t.Array(orderGameSchema),
        meta: t.Object({
          hasNextPage: t.Boolean(),
          endCursor: t.Optional(t.String()),
        }),
      })),
      400: withError(),
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
