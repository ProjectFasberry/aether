import { atom } from "@reatom/core";
import { reatomComponent } from "@reatom/npm-react";
import { Typography } from "@repo/ui/typography";
import { cartIsValidAtom, cartDataSelectedAtom } from "../../models/store-cart.model";
import { CartPrice } from "./cart-price";
import { Link } from "@/shared/components/config/link";
import { Button } from "@repo/ui/button";
import { spawn } from "@reatom/framework";
import { createOrderAction } from "../../models/store.model";
import { CartItem } from "./cart-item";
import { ChangeRecipientDialog } from "../recipient/change-recipient";
import { IconCreditCardPay } from "@tabler/icons-react";
import { expImage } from "@/shared/consts/images";
import { cartDataAtom } from "../../models/store-cart.model.atoms";
import { WithLoader } from "../../../layout/components/with-loader";
import { navigate } from "vike/client/router";

const CartContentData = reatomComponent(({ ctx }) => {
  const data = ctx.spy(cartDataAtom);

  return (
    <div className="flex flex-col gap-4 w-full">
      <ChangeRecipientDialog />
      {data.map(item => <CartItem key={item.id} {...item} />)}
    </div>
  )
}, "CartContentData")

const CartSummerySelected = reatomComponent(({ ctx }) => ctx.spy(cartDataSelectedAtom).length, "CartSummerySelected")
const CartSummeryTotal = reatomComponent(({ ctx }) => ctx.spy(cartDataAtom).length, "CartSummery")

const CartActionsSubmit = reatomComponent(({ ctx }) => {
  const isValid = ctx.spy(cartIsValidAtom) || ctx.spy(createOrderAction.statusesAtom).isPending;

  const handle = () => void spawn(ctx, async (spawnCtx) => createOrderAction(spawnCtx))

  return (
    <Button
      disabled={!isValid}
      onClick={handle}
      className="w-full h-10 bg-gradient-to-br
        from-green-600/90 via-green-600/80 to-green-600/80 border border-green-700"
    >
      <Typography className="text-lg font-semibold">
        К оформлению
      </Typography>
    </Button>
  )
}, "CartActionsSubmit")

const CartContentEmpty = () => {
  return (
    <div className="flex flex-col gap-2 lg:w-2/3">
      <Typography className='text-2xl font-semibold'>
        Пусто
      </Typography>
      <Typography color="gray">
        Перейдите в магазин, чтобы найти всё, что нужно.
      </Typography>
      <Link href="/store" className="w-fit">
        <Button background="default" className="font-semibold">
          В магазин
        </Button>
      </Link>
    </div>
  )
}

const cartDataIsEmptyAtom = atom(
  (ctx) => ctx.spy(cartDataAtom).length === 0,
  "cartDataIsEmpty"
)

const loaderIsActiveAtom = atom(
  (ctx) => ctx.spy(createOrderAction.statusesAtom).isPending,
  "loaderIsActive"
)

const CartListContent = reatomComponent(({ ctx }) => {
  const isEmpty = ctx.spy(cartDataIsEmptyAtom);
  if (isEmpty) return <CartContentEmpty />;

  return (
    <div className="flex flex-col gap-4 lg:w-2/3 bg-neutral-900/60 p-3 lg:p-4 rounded-xl">
      <div className="flex flex-col gap-1">
        <Typography className="text-xl font-semibold">
          Содержимое
        </Typography>
        <div className="flex items-center justify-between w-full gap-2">
          <Typography className="text-neutral-400">
            Товаров: <CartSummeryTotal />
          </Typography>
          <Typography className="text-neutral-400">
            Выбрано: <CartSummerySelected />
          </Typography>
        </div>
      </div>
      <CartContentData />
    </div>
  )
}, 'CartListContent')

export const CartContent = () => {
  return (
    <WithLoader loaderAtom={loaderIsActiveAtom} title="Готовим заказ">
      <div className="flex flex-col gap-6 w-full h-full">
        <Typography className="text-3xl font-semibold">
          Хранилище
        </Typography>
        <div className="flex flex-col lg:flex-row items-start w-full gap-6 h-fit">
          <CartListContent />
          <div className="flex flex-col lg:w-1/3 bg-neutral-900/60 gap-4 p-3 lg:p-4 rounded-xl w-full">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center w-full gap-2">
                <div className="flex-1 flex w-full">
                  <CartActionsSubmit />
                </div>
                <div className="flex-1 flex w-full">
                  <Button
                    onClick={() => navigate("/store/cart/topup")}
                    background="white"
                    className="flex-1 text-nowrap truncate gap-1 min-w-0 h-10 aspect-square p-0"
                  >
                    <IconCreditCardPay size={22} />
                    <Typography className="text-base font-semibold">
                      Пополнить счет
                    </Typography>
                  </Button>
                </div>
              </div>
              <div
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full h-full"
              >
                <div className="flex items-start gap-2 justify-center w-fit rounded-lg">
                  <div className="flex items-center justify-center bg-neutral-600/40 p-2 rounded-lg">
                    <img
                      src={expImage}
                      loading="lazy"
                      width={32}
                      height={32}
                      alt=""
                      draggable={false}
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <Typography color="gray" className="text-lg leading-6">
                      Стоимость
                    </Typography>
                    <CartPrice />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WithLoader>
  )
}