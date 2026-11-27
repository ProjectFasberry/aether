import Elysia from "elysia";
import { storeItemCreate } from "./store-item-create.route";
import { storeItemDelete } from "./store-item-delete.route";
import { storeMethodsEdit, storeMethodsList } from "./store-methods.route";
import { storeItemEditGroup } from "./store-item-edit.route";
import { storeItemImage } from "./store-item-image.route";
import { storeItemList } from "./store-item-list.route";

export const storePrivate = new Elysia()
  .group("/store", app => app
    .group("/item", app => app
      .use(storeItemCreate)
      .use(storeItemImage)
      .use(storeItemDelete)
      .use(storeItemList)
      .use(storeItemEditGroup)
    )
    .group("/methods", app => app
      .use(storeMethodsList)
      .use(storeMethodsEdit)
    )
  );
