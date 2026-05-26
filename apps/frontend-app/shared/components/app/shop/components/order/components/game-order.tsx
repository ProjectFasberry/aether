import { createLink, Link } from "@/shared/components/config/link";
import { reatomComponent } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"
import dayjs from "@/shared/lib/create-dayjs";
import { useData } from "vike-react/useData";
import { type Data, type OrderSingleGamePayload } from "@/pages/store/order/@id/+data";

export const GameOrder = reatomComponent(({ ctx }) => {
  const data = useData<Data>().data as OrderSingleGamePayload

  if (!data) return null;

  return (
    <div className="flex flex-col gap-6 mx-auto rounded-2xl">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold">
          Заказ #{data.unique_id}
        </h1>
        <Typography className="text-neutral-50 text-lg">
          Инициатор:&nbsp;
          <span className="text-neutral-400">
            {data.initiator}
          </span>
        </Typography>
        <Typography className="text-neutral-50 text-lg">
          Создан:&nbsp;
          <span className="text-neutral-400">
            {dayjs(data.created_at).format("DD MMM YYYY в HH:mm")}
          </span>
        </Typography>
        <Typography className="text-neutral-50 text-lg">
          Статус: {data.finished_at
            ? <span className="text-green-600" title={dayjs(data.finished_at).format("DD MMM YYYY в HH:mm")}>завершен</span>
            : <span className="text-neutral-400">в процессе</span>
          }
        </Typography>
      </header>
      <section className="flex flex-col h-full gap-2 w-full">
        <h2 className="font-semibold text-xl">
          Предметы
        </h2>
        <div className="flex flex-col gap-1 w-full">
          {data.items.map((item) => (
            <Link
              key={item.id}
              href={createLink("store", item.store_item_id.toString())}
              target="_blank"
              className="flex hover:bg-neutral-800 flex-col md:flex-row justify-between md:items-center border border-neutral-800 p-4 rounded-lg"
            >
              <div className="mb-2 md:mb-0">
                <Typography className="text-neutral-200 font-medium">
                  {item.name}
                </Typography>
                <Typography className="text-neutral-400 text-sm">
                  ID: {item.store_item_id}
                </Typography>
              </div>
              <div className="text-neutral-300 text-sm md:text-base">
                Получатель: {item.recipient}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}, "Order")
