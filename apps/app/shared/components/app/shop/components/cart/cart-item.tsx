import { reatomComponent } from "@reatom/npm-react"
import { Button } from "@repo/ui/button"
import { IconCheck, IconGift, IconTrash } from "@tabler/icons-react"
import { Typography } from "@repo/ui/typography"
import { createLink } from "@/shared/components/config/link"
import { storeItem } from "../../models/store-item.model"
import { CartItem as CartItemProps } from "@repo/shared/types/entities/store"
import { CURRENCIES } from "./cart-price"
import { cart, cartDataItemIsSelectAtom } from "../../models/store-cart.model"
import { changeRecipient } from "../../models/store-recipient.model"

const CartItemRemoveFromCart = reatomComponent<{ id: number }>(({ ctx, id }) => {
  return (
    <Button
      title="Удалить"
      className="flex cursor-pointer items-center justify-center h-8 p-1 rounded-lg bg-neutral-800"
      onClick={() => cart.removeItem(ctx, id)}
      disabled={ctx.spy(cart.removeItem.statusesAtom).isPending}
    >
      <IconTrash size={22} />
    </Button>
  )
}, "CartItemRemoveFromCart")

const CartItemUpdateSelectStatus = reatomComponent<{ id: number }>(({ ctx, id }) => {
  const selected = ctx.spy(cartDataItemIsSelectAtom(id))

  return (
    <Button
      className="absolute top-3 left-3 flex items-center justify-center !p-0 w-6 h-6 bg-green-600/80"
      onClick={() => storeItem.updateSelectedStatus(ctx, id)}
      disabled={ctx.spy(storeItem.updateSelectedStatus.statusesAtom).isPending}
    >
      {selected ? <IconCheck size={22} /> : null}
    </Button>
  )
}, "CartItemUpdateSelectStatus")

export const CartItem = reatomComponent<CartItemProps>(({
  ctx, ...item
}) => {
  const { id, title, imageUrl, description, recipient, price, currency } = item

  return (
    <div
      id={id.toString()}
      className="flex items-center w-full relative gap-2 sm:gap-4 max-h-32 overflow-hidden rounded-lg p-2 sm:p-6 
        border border-neutral-800"
    >
      <CartItemUpdateSelectStatus id={id} />
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <div className="flex items-center select-none min-h-12 min-w-12 h-12 w-12 justify-center overflow-hidden rounded-lg">
          <img
            src={imageUrl}
            draggable={false}
            width={56}
            height={56}
            alt=""
          />
        </div>
        <div className="flex flex-col justify-center w-full gap-2">
          <a href={createLink("store", id.toString())} target="_blank" className="flex flex-col">
            <Typography className="text-md sm:text-base font-semibold truncate">
              {title}
            </Typography>
            <Typography className="text-neutral-400 line-clamp-1 leading-tight text-sm w-full">
              {description}
            </Typography>
          </a>
          <div className="flex items-center gap-1">
            <Button
              className="p-0 h-8 w-8 bg-neutral-800 rounded-lg"
              onClick={() => changeRecipient.openDialog(ctx, item)}
            >
              <IconGift size={20} />
            </Button>
            <CartItemRemoveFromCart id={id} />
          </div>
        </div>
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1">
          <Typography className="font-semibold text-nowrap">
            {price}
          </Typography>
          <img
            src={CURRENCIES[currency].img}
            draggable={false}
            alt={CURRENCIES[currency].symbol}
            className="w-5 h-5 inline-block"
          />
        </div>
      </div>
    </div>
  )
}, "CartItem")