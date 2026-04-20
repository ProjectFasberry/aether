import Elysia from "elysia";
import { getOrder } from "./order.model";
import * as z from "zod/v4";
import type { OrderSinglePayload } from "@repo/shared/types/entities/store";

export const orderRoute = new Elysia()
  .get("/:id", async ({ params, query: { type } }) => {
    const id = params.id;
    const query = await getOrder(id, type)

    if (!query) return null;

    const data: OrderSinglePayload = {
      ...query,
      type
    }
    
    return { data }
  }, {
    query: z.object({
      type: z.enum(["default", "game"]).optional().default("default")
    })
  })