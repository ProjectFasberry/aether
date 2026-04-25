import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Typography } from "@repo/ui/typography"
import { OrdersFilterOption, cartOrders, cartOrdersState, StoreOrdersStateStatus, StoreOrdersStateType } from "../../models/store-orders.model"
import { Link } from "@/shared/components/config/link"
import { Button } from "@repo/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/dropdown-menu"
import { PageLoader } from "@/shared/ui/page-loader"
import { AtomMut, Ctx } from "@reatom/core"

const STATUSES: Record<string, string> = {
  "pending": "Ждёт оплаты",
  "succeeded": "Завершён"
}

const CartOrdersEmpty = () => {
  return (
    <div className="flex flex-col w-full bg-neutral-900 p-2 sm:p-3 lg:p-4 rounded-lg">
      <Typography className='text-2xl font-semibold'>Пусто</Typography>
      <Typography className="text-neutral-400 text-base leading-5">
        Заказ появится сразу после оформления
      </Typography>
      <Link href="/store/cart" className="w-fit mt-4 leading-5 text-base text-green-400">
        В корзину
      </Link>
    </div>
  )
}

type OrdersFilterDropdownProps = {
  label: string;
  options: OrdersFilterOption[];
  currentValue: AtomMut<any>;
  onSelect: (ctx: Ctx, value: string) => void;
}

const OrdersFilterDropdown = reatomComponent<OrdersFilterDropdownProps>(({ ctx, label, options, currentValue }) => {
  const current = ctx.spy(currentValue);
  const activeOption = options.find(o => o.value === current);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button background="default" className="truncate min-w-0 py-1">
          {label}: &nbsp;<span className="text-neutral-400">{activeOption?.title}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="flex flex-col gap-1 w-full">
          {options.map((item) => (
            <DropdownMenuItem
              key={item.value}
              data-state={current === item.value ? "active" : "inactive"}
              className="group"
              onClick={() => currentValue(ctx, item.value as StoreOrdersStateStatus | StoreOrdersStateType)}
            >
              <Typography className="group-data-[state=active]:text-green-600 group-data-[state=inactive]:text-neutral-50">
                {item.title}
              </Typography>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}, "OrdersFilterDropdown");

const CartOrdersList = reatomComponent(({ ctx }) => {
  useUpdate(cartOrders.fetch, [])

  if (ctx.spy(cartOrders.fetch.statusesAtom).isPending) return <PageLoader />

  const data = ctx.spy(cartOrders.fetch.dataAtom)
  if (!data) return <CartOrdersEmpty />

  return (
    <div id="content" className='flex flex-col gap-2 rounded-xl bg-neutral-900 p-2 sm:p-3 lg:p-4 w-full h-full'>
      {data.map((order) => (
        <Link
          key={order.unique_id}
          href={`/store/order/${order.unique_id}?type=${order.type}`}
          className="flex items-center justify-between w-full p-4 rounded-lg border border-neutral-800"
        >
          <div className="flex flex-col gap-1 min-w-0">
            <Typography className="font-semibold truncate text-lg leading-5">
              Заказ #{order.unique_id}
            </Typography>
            <Typography className="text-neutral-400 truncate text-sm leading-4">
              {STATUSES[order.status]}
            </Typography>
          </div>
        </Link>
      ))}
    </div>
  )
}, "CartOrders")

export const CartOrders = () => {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <Typography className="text-3xl font-semibold">
        Заказы
      </Typography>
      <div className="flex flex-col gap-4 h-full w-full">
        <div id="filters" className="flex items-center gap-2 w-full">
          <OrdersFilterDropdown
            label="Статус"
            options={cartOrdersState.STATUS_OPTIONS}
            currentValue={cartOrdersState.status}
            onSelect={(ctx, val) => cartOrdersState.status(ctx, val as StoreOrdersStateStatus)}
          />
          <OrdersFilterDropdown
            label="Тип"
            options={cartOrdersState.TYPE_OPTIONS}
            currentValue={cartOrdersState.type}
            onSelect={(ctx, val) => cartOrdersState.type(ctx, val as StoreOrdersStateType)}
          />
        </div>
        <CartOrdersList />
      </div>
    </div>
  )
}