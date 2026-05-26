import { reatomComponent, } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"
import { renderToHTMLString } from "@tiptap/static-renderer";
import type { JSONContent } from "@tiptap/react";
import { tv } from "tailwind-variants";
import { storeItemState } from "@/shared/components/app/shop/models/store-item.model";
import { ItemPrice, ItemSelectToCart } from "@/shared/components/app/shop/components/items/store-item";
import { editorExtensions } from "@/shared/components/config/editor/editor.model";

const sectionVariant = tv({
  base: `border border-neutral-800 p-2! sm:p-4! rounded-lg w-full`
})

const SelectedDonate = reatomComponent(({ ctx }) => {
  const data = ctx.spy(storeItemState.data)
  if (!data) return null;

  const html = renderToHTMLString({
    extensions: editorExtensions,
    content: data.content as JSONContent
  })

  return (
    <div className="flex flex-col sm:flex-row items-start gap-6 w-full justify-center h-full">
      <div className="flex w-full items-center justify-center sm:w-1/4 bg-neutral-800/40 p-4 rounded-3xl">
        <img
          src={data.imageUrl}
          width={256}
          draggable={false}
          height={256}
          alt={data.title}
        />
      </div>
      <div className="flex flex-col gap-4 w-full sm:w-2/4 h-full">
        <div id="header" className="flex flex-col w-full gap-1">
          <Typography className="text-lg font-semibold leading-5 sm:text-xl lg:text-2xl">
            {data.title}
          </Typography>
          <Typography className="text-sm text-neutral-400 leading-5 md:text-base">
            {data.description}
          </Typography>
        </div>
        <div id="desc" className="flex flex-col gap-1 w-full">
          <Typography className="text-lg font-semibold sm:text-xl">
            Описание
          </Typography>
          <div
            id="content"
            dangerouslySetInnerHTML={{ __html: html }}
            className={sectionVariant({ className: "tiptap whitespace-pre-wrap" })}
          />
        </div>
      </div>
      <div id="purchase" className="flex flex-col gap-1 w-full sm:w-1/4">
        <Typography className="text-lg font-semibold sm:text-xl">
          Стоимость и покупка
        </Typography>
        <div className={sectionVariant({ className: "flex flex-col items-center gap-4" })}>
          <div className="flex bg-neutral-800 rounded-lg p-2 w-full">
            <ItemPrice currency={data.currency} price={data.price} />
          </div>
          <div className="flex items-center gap-1 w-full">
            <ItemSelectToCart id={data.id} />
          </div>
        </div>
      </div>
    </div>
  )
}, "SelectedDonate")

export default function Page() {
  return <SelectedDonate />
}
