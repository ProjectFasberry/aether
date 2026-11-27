import Elysia from "elysia";
import { validatePermission } from "#/lib/validators";
import { buildRouteSummary } from "#/lib/routes";
import { withData } from "#/shared/schemas";
import { store, storeItemsSchema, storeListSchema } from "../../store/items/store-items.model";

/** Larger than the public page: the panel scrolls through the full catalog. */
const PANEL_PAGE_SIZE = 50;

export const storeItemList = new Elysia()
  .use(validatePermission("store.item.read"))
  .get(
    "/list",
    async ({ query }) => ({ data: await store.getItems(query, PANEL_PAGE_SIZE) }),
    {
      query: storeListSchema,
      response: {
        200: withData(storeItemsSchema),
      },
      detail: {
        summary: buildRouteSummary("List store items for the panel"),
      },
    },
  );
