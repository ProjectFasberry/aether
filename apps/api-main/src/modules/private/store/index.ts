import Elysia from "elysia";
import { storeItemCreate } from "./store-item-create.route";
import { storeItemDelete } from "./store-item-delete.route";
import { storeMethodsEdit, storeMethodsList } from "./store-methods.route";
import { storeItemEditGroup } from "./store-item-edit.route";

export const storePrivate = new Elysia()
  .group("/store", app => app
    .group("/item", app => app
      .use(storeItemCreate)
      .use(storeItemDelete)
      .use(storeItemEditGroup)
    )
    .group("/methods", app => app
      .use(storeMethodsList)
      .use(storeMethodsEdit)
    )
  )