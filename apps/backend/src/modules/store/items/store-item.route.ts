import Elysia from "elysia";
import * as z from "zod/v4";
import { store } from "./store-items.model";

export const storeItem = new Elysia()
  .get("/item/:id", async ({ params: { id } }) => {
    const data = await store.getItem(id)
    return { data }
  }, {
    params: z.object({
      id: z.coerce.number()
    })
  })