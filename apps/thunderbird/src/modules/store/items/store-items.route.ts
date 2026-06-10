import Elysia from "elysia";
import { store, storeItemsSchema, storeListSchema } from "./store-items.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

export const storeItems = new Elysia()
  .get("/items", async ({ query }) => {
    const data = await store.getItems(query);
    return { data }
  }, {
    query: storeListSchema,
    response: {
      200: withData(
        storeItemsSchema
      )
    },
    detail: {
      summary: buildRouteSummary("Get store items")
    }
  })
