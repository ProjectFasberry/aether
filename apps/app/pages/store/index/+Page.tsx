import { StoreFilterList, StoreFiltersSheet, StoreSearch } from "@/shared/components/app/shop/components/filters/store-filters";
import { StoreList } from "@/shared/components/app/shop/components/items/store-list";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { PageHeaderImage } from "@/shared/ui/header-image";
import { Typography } from "@repo/ui/typography";

const storeImage = getStaticImage("images/marketplace_art.webp")

export default function Page() {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <PageHeaderImage img={storeImage} />
      <div className="flex flex-col gap-4 h-full w-full">
        <Typography className="text-3xl font-semibold">Магазин</Typography>
        <div className="flex items-center gap-2 justify-between w-full">
          <StoreSearch />
          <StoreFiltersSheet />
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
      </div>
    </div>
  )
}
