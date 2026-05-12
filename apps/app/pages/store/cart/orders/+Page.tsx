import { CartOrdersFilters, CartOrdersList } from "@/shared/components/app/shop/components/cart/cart-orders";
import { Typography } from "@/shared/ui/typography"

export default function Page() {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <Typography className="text-3xl font-semibold">
        Заказы
      </Typography>
      <div className="flex flex-col gap-4 h-full w-full">
        <CartOrdersFilters />
        <CartOrdersList />
      </div>
    </div>
  )
}