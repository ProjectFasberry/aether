import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Typography } from "@/shared/ui/typography"
import { type OrdersFilterOption, cartOrders, cartOrdersState } from "../../models/store-orders.model"
import { Link } from "@/shared/components/config/link"
import { Button } from "@/shared/ui/button"
import { PageLoader } from "@/shared/ui/page-loader"
import { type AtomMut, type Ctx } from "@reatom/framework"
import { Menu } from '@ark-ui/react/menu'
import { dropdownMenuItemVariants, menuArrowTipVariant, menuArrowVariant, menuContentVariant } from "@/shared/ui/menu"

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
    <div>
      <Menu.Root
        onSelect={({ value }) => {
          currentValue(ctx, value)
        }}
      >
        <Menu.Trigger asChild>
          <Button background="default" className="truncate min-w-0 py-1">
            {label}: &nbsp;<span className="text-neutral-400">{activeOption?.title}</span>
          </Button>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content className={menuContentVariant()}>
            <Menu.Arrow className={menuArrowVariant()}>
              <Menu.ArrowTip className={menuArrowTipVariant()} />
            </Menu.Arrow>
            <div className="flex flex-col gap-1 w-full">
              {options.map((item) => (
                <Menu.Item
                  key={item.value}
                  value={item.value}
                  data-state={current === item.value ? "active" : "inactive"}
                  className={dropdownMenuItemVariants({ className: "data-[state=active]:text-green-600 data-[state=inactive]:text-neutral-50"})}
                >
                  <Typography>
                    {item.title}
                  </Typography>
                </Menu.Item>
              ))}
            </div>
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>
    </div>
  );
}, "OrdersFilterDropdown");

export const CartOrdersList = reatomComponent(({ ctx }) => {
  useUpdate(cartOrders.fetch, [])

  if (ctx.spy(cartOrders.fetch.statusesAtom).isPending) return <PageLoader />

  const data = ctx.spy(cartOrders.fetch.dataAtom)
  if (!data) return <CartOrdersEmpty />

  const getOrderLink = (uniqueId: string) => `/store/order/${uniqueId}?type=${ctx.get(cartOrdersState.type)}`

  return (
    <div id="content" className='flex flex-col gap-2 rounded-xl bg-neutral-900 p-2 sm:p-3 lg:p-4 w-full h-full'>
      {data.map((order) => (
        <Link
          key={order.unique_id}
          href={getOrderLink(order.unique_id)}
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

export const CartOrdersFilters = () => {
  return (
    <div id="filters" className="flex items-center gap-2 w-full">
      <OrdersFilterDropdown
        label="Статус"
        options={cartOrdersState.STATUS_OPTIONS}
        currentValue={cartOrdersState.status}
        onSelect={(ctx, val) => cartOrdersState.status(ctx, val)}
      />
      <OrdersFilterDropdown
        label="Тип"
        options={cartOrdersState.TYPE_OPTIONS}
        currentValue={cartOrdersState.type}
        onSelect={(ctx, val) => cartOrdersState.type(ctx, val)}
      />
    </div>
  )
}