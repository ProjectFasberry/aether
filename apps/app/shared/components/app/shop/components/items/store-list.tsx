import { Typography } from "@/shared/ui/typography"
import { reatomComponent } from "@reatom/npm-react"
import { storeItems, storeItemsState } from "../../models/store.model"
import { getStaticImage } from "@/shared/lib/volume-helpers"
import { PageLoader } from "@/shared/ui/page-loader"
import { StoreItem } from "./store-item"
import { isEmptyArray } from "@/shared/lib/helpers"

const itemsNotFoundImage = getStaticImage("minecraft/items/block_inspect.webp")

const ItemsNotFound = () => {
  return (
    <div className="flex flex-col gap-2 items-center h-full justify-center w-full">
      <img src={itemsNotFoundImage} width={64} height={64} alt="" />
      <Typography className="text-xl font-semibold">Доступных товаров нет</Typography>
    </div>
  )
}

export const StoreList = reatomComponent(({ ctx }) => {
  if (ctx.spy(storeItems.fetch.statusesAtom).isPending) {
    return <PageLoader />
  }

  const data = ctx.spy(storeItemsState.data)
  if (!data || isEmptyArray(data)) return <ItemsNotFound />;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 auto-rows-auto gap-2 lg:gap-4 w-full h-full">
      {data.map(item => <StoreItem key={item.id} {...item} />)}
    </div>
  )
}, "StoreList")