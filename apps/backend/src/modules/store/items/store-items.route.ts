import Elysia from "elysia";
import { store, storeListSchema } from "./store-items.model";

export const storeItems = new Elysia()
  .get("/items", async ({ query }) => {
    const data = await store.getItems(query);
    return { data }
  }, {
    query: storeListSchema
  })