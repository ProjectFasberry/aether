import { reatomComponent } from "@reatom/npm-react"
import { Typography } from "@/shared/ui/typography"
import { cartState } from "../../models/store-cart.model"
import { CURRENCIES } from "@/shared/consts/store";

export const CartPrice = reatomComponent(({ ctx }) => {
  const prices = ctx.spy(cartState.price)

  return (
    <div className="space-y-1">
      {Object.entries(prices).map(([currency, value]) => {
        const { symbol, img } = CURRENCIES[currency] ?? { symbol: currency }

        return (
          <Typography key={currency} className="text-lg leading-5 font-semibold flex items-center gap-1">
            {img ? <img src={img} draggable={false} alt={symbol} className="w-5 h-5 inline-block" /> : symbol} {value}
          </Typography>
        )
      })}
    </div>
  )
}, "CartPrice")
