import Elysia, { t } from "elysia";
import { store, storeItemsItemSchema } from "./store-items.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

export const storeItem = new Elysia()
  .get("/item/:id", async ({ params: { id } }) => {
    const data = await store.getItem(id)
    return { data }
  }, {
    params: t.Object({
      id: t.Number()
    }),
    response: {
      200: withData(
        t.Nullable(storeItemsItemSchema)
      )
    },
    detail: {
      summary: buildRouteSummary("Get store item")
    }
  })
