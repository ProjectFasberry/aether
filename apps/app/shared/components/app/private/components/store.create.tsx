import { editorExtensions, EditorMenuBar } from "@/shared/components/config/editor";
import { getFromDictionary } from "@/shared/models/app/base.model";
import { AtomState, Ctx } from "@reatom/framework";
import { reatomComponent } from "@reatom/npm-react";
import { Input } from "@repo/ui/input";
import { EditorContent, useEditor } from "@tiptap/react";
import { 
  createStoreItemAction, 
  createStoreItemContentAtom, 
  createStoreItemСommandAtom, 
  createStoreItemCurrencyAtom, 
  createStoreItemImageUrlAtom, 
  createStoreItemPriceAtom, 
  createStoreItemTitleAtom, 
  createStoreItemValueAtom, 
  createStoreItemTypeAtom
} from "../models/store.model";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@repo/ui/select";
import { Button } from "@repo/ui/button";
import { Typography } from "@repo/ui/typography";
import { IconCheck } from "@tabler/icons-react";

const currencyValues = ["CHARISM", "BELKOIN"];

const getCurrencyTitle = (ctx: Ctx, value: string) => getFromDictionary(ctx, value)

const CURRENCY_ITEMS = (ctx: Ctx) => currencyValues.map((value) => ({
  value,
  title: getCurrencyTitle(ctx, value)!,
}));

const TYPE_ITEMS = [
  { title: "Ивент", value: "event" },
  { title: "Донат", value: "donate" }
]

export const CreateItem = reatomComponent(({ ctx }) => {
  const editor = useEditor({
    extensions: editorExtensions,
    onUpdate: ({ editor }) => {
      createStoreItemContentAtom(ctx, editor.getJSON())
    }
  })

  const items = CURRENCY_ITEMS(ctx)

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <Input
        value={ctx.spy(createStoreItemTitleAtom)}
        onChange={e => createStoreItemTitleAtom(ctx, e.target.value)}
        placeholder="Заголовок"
      />
      <Input
        value={ctx.spy(createStoreItemValueAtom) ?? ""}
        onChange={e => createStoreItemValueAtom(ctx, e.target.value)}
        placeholder="Значение"
      />
      <Input
        value={ctx.spy(createStoreItemСommandAtom) ?? ""}
        onChange={e => createStoreItemСommandAtom(ctx, e.target.value)}
        placeholder="Команда для выдачи"
      />
      <Input
        type="file"
        onChange={e => {
          if (!e.target.files) return;
          const file = e.target.files[0]

          createStoreItemImageUrlAtom(ctx, URL.createObjectURL(file))
        }}
      />
      <div className="flex items-center gap-2 w-full">
        <Input
          value={ctx.spy(createStoreItemPriceAtom) ?? ""}
          onChange={e => createStoreItemPriceAtom(ctx, e.target.value)}
          placeholder="Цена"
          type="number"
          className="bg-transparent border border-neutral-800 text-sm h-8 w-fit"
        />
        <Select
          value={ctx.spy(createStoreItemCurrencyAtom)}
          onValueChange={v => createStoreItemCurrencyAtom(ctx, v as AtomState<typeof createStoreItemCurrencyAtom>)}
        >
          <SelectTrigger className="border border-neutral-800 h-8! px-4">
            {getCurrencyTitle(ctx, ctx.spy(createStoreItemCurrencyAtom))}
          </SelectTrigger>
          <SelectContent>
            {items.map((currency) => (
              <SelectItem key={currency.value} value={currency.value}>
                {currency.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={ctx.spy(createStoreItemTypeAtom) ?? undefined}
          onValueChange={v => createStoreItemTypeAtom(ctx, v as AtomState<typeof createStoreItemTypeAtom>)}
        >
          <SelectTrigger className="border border-neutral-800 h-8! px-4">
            {ctx.spy(createStoreItemTypeAtom)}
          </SelectTrigger>
          <SelectContent>
            {TYPE_ITEMS.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col">
        <EditorMenuBar editor={editor} />
        <EditorContent editor={editor} />
      </div>
      <div className="flex items-center justify-end w-full">
        <Button
          className="h-10 w-fit items-center gap-2 justify-center px-4 bg-neutral-800"
          onClick={() => createStoreItemAction(ctx)}
          disabled={ctx.spy(createStoreItemAction.statusesAtom).isPending}
        >
          <Typography className="font-semibold text-lg text-neutral-50">
            Создать
          </Typography>
          <IconCheck size={18} />
        </Button>
      </div>
    </div>
  )
}, "CreateItem")