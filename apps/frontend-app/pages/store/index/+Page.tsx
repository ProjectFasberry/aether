import { StoreFilterList, StoreFiltersSheet, StoreSearch } from "@/shared/components/app/shop/components/filters/store-filters";
import { StoreList } from "@/shared/components/app/shop/components/items/store-list";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { translate } from "@/shared/locales/helpers";
import { appState } from "@/shared/models/app/index.model";
import { PageHeaderImage } from "@/shared/ui/header-image";
import { reatomComponent } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"

const storeImage = getStaticImage("images/marketplace_art.webp")

const Store = reatomComponent(({ ctx }) => {
  const isMobile = ctx.spy(appState.current.isMobile)

  return (
    <>
      <div className="flex items-center gap-2 justify-between w-full">
        <StoreSearch />
        {isMobile && <StoreFiltersSheet />}
      </div>
      <div className="flex flex-col gap-4 xl:flex-row items-start w-full h-full">
        <div className="flex flex-col gap-2 h-full w-full xl:w-1/5">
          <div className="bg-neutral-900 rounded-xl hidden xl:flex flex-col gap-6 w-full h-full p-2 sm:p-3 lg:p-4">
            <StoreFilterList />
          </div>
        </div>
        <div className="flex flex-col items-start w-full h-fit gap-4 xl:w-4/5 min-h-dvh">
          <StoreList />
        </div>
      </div>
    </>
  )
}, "Store")

export default function Page() {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <PageHeaderImage img={storeImage} />
      <div className="flex flex-col gap-4 h-full w-full">
        <Typography className="text-3xl font-semibold">{translate["store.title"]()}</Typography>
        <Store />
      </div>
    </div>
  )
}