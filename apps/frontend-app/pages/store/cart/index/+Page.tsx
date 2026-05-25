import { WithLoader } from "@/shared/components/app/layout/components/with-loader";
import { CartActions, CartListContent } from "@/shared/components/app/shop/components/cart/cart-content";
import { loaderIsActiveAtom } from "@/shared/components/app/shop/models/store-order.model";
import { Typography } from "@/shared/ui/typography"

export default function Page() {
  return (
    <WithLoader loaderAtom={loaderIsActiveAtom} title="Готовим заказ">
      <div className="flex flex-col gap-6 w-full h-full">
        <Typography className="text-3xl font-semibold">
          Хранилище
        </Typography>
        <div className="flex flex-col lg:flex-row items-start w-full gap-6 h-fit">
          <CartListContent />
          <CartActions />
        </div>
      </div>
    </WithLoader>
  )
}