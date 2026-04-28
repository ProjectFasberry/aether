import Elysia, { t } from "elysia";
import { store } from "./store-items.model";

export const storeItem = new Elysia()
  .get("/item/:id", async ({ params: { id } }) => {
    const data = await store.getItem(id)
    return { data }
  }, {
    params: t.Object({
      id: t.Number()
    })
  })