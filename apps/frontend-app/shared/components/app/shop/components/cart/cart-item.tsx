import { reatomComponent } from "@reatom/npm-react"
import { Button } from "@/shared/ui/button"
import { IconGift, IconTrash } from "@tabler/icons-react"
import { Typography } from "@/shared/ui/typography"
import { createLink } from "@/shared/components/config/link"
import { storeItem } from "../../models/store-item.model"
import { cart, cartDataItemIsSelectAtom, type CartItem as CartItemProps } from "../../models/store-cart.model"
import { changeLocalRecipient } from "../../../settings/models/settings-store.model"
import { Checkbox } from "@/shared/ui/checkbox"
import { CURRENCIES } from "@/shared/consts/store"

const CartItemRemoveFromCart = reatomComponent<{ id: number }>(({ ctx, id }) => {
  return (
    <Button
      title="Удалить"
      background="default"
      className="h-8 p-0 aspect-square"
      onClick={() => cart.removeItem(ctx, id)}
      disabled={ctx.spy(cart.removeItem.statusesAtom).isPending}
    >
      <IconTrash size={22} />
    </Button>
  )
}, "CartItemRemoveFromCart")

const CartItemUpdateSelectStatus = reatomComponent<{ id: number }>(({ ctx, id }) => {
  return (
    <Checkbox
      withIndicator
      variant="filled"
      className="absolute top-3 left-3 p-0 w-5 h-5"
      checked={ctx.spy(cartDataItemIsSelectAtom(id))}
      onCheckedChange={(value) => value && storeItem.updateSelectedStatus(ctx, id)}
      disabled={ctx.spy(storeItem.updateSelectedStatus.statusesAtom).isPending}
    />
  )
}, "CartItemUpdateSelectStatus")

export const CartItem = reatomComponent<CartItemProps>(({
  ctx, ...item
}) => {
  const { id, title, imageUrl, description, price, currency } = item

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
              background="default"
              className="p-0 h-8 aspect-square"
              onClick={() => changeLocalRecipient.openDialog(ctx, item)}
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
