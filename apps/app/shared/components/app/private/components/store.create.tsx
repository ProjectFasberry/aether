import { editorExtensions, EditorMenuBar } from "@/shared/components/config/editor";
import { getFromDictionary } from "@/shared/models/app/utils";
import { type AtomState, type Ctx } from "@reatom/framework";
import { reatomComponent } from "@reatom/npm-react";
import { Input } from "@/shared/ui/input";
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
import { Button } from "@/shared/ui/button";
import { Typography } from "@/shared/ui/typography";
import { IconCheck, IconSelector, IconX } from "@tabler/icons-react";
import { Portal } from '@ark-ui/react/portal'
import { Select, createListCollection } from '@ark-ui/react/select'
import { 
  selectClearTriggerVariant, selectContentBaseStyle, selectContentVariant, selectControlVariant, 
  selectIndicatorsVariant, selectIndicatorVariant, selectItemGroupVariant, selectItemIndicatorVariant, 
  selectItemTextVariant, selectItemVariant, selectTriggerVariant 
} from "@/shared/ui/select"

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

  const collectionf = createListCollection({
    items: items,
  })

  const collectionss = createListCollection({
    items: TYPE_ITEMS,
  })

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
        <Select.Root
          collection={collectionf}
          onValueChange={({ value }) => createStoreItemCurrencyAtom(ctx, value[0] as AtomState<typeof createStoreItemCurrencyAtom>)}
          className="flex flex-col gap-1 w-full"
        >
          <Select.Control className={selectControlVariant()}>
            <Select.Trigger className={selectTriggerVariant()}>
              <Select.ValueText className="border border-neutral-800 h-8 px-4">
                {getCurrencyTitle(ctx, ctx.spy(createStoreItemCurrencyAtom))}
              </Select.ValueText>
            </Select.Trigger>
            <div className={selectIndicatorsVariant()}>
              <Select.ClearTrigger className={selectClearTriggerVariant()}>
                <IconX size={20} />
              </Select.ClearTrigger>
              <Select.Indicator className={selectIndicatorVariant()}>
                <IconSelector size={20} />
              </Select.Indicator>
            </div>
          </Select.Control>
          <Portal>
            <Select.Positioner>
              <Select.Content className={selectContentVariant()} style={selectContentBaseStyle}>
                <Select.ItemGroup className={selectItemGroupVariant()}>
                  {items.map((item) => (
                    <Select.Item key={item.value} item={item} className={selectItemVariant()}>
                      <Select.ItemText className={selectItemTextVariant()}>
                        {item.title}
                      </Select.ItemText>
                      <Select.ItemIndicator className={selectItemIndicatorVariant()}>
                        <IconCheck size={16} />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.ItemGroup>
              </Select.Content>
            </Select.Positioner>
          </Portal>
          <Select.HiddenSelect />
        </Select.Root>
        <Select.Root
          collection={collectionss}
          onValueChange={({ value }) => createStoreItemTypeAtom(ctx, value[0] as AtomState<typeof createStoreItemTypeAtom>)}
          className="flex flex-col gap-1 w-full"
        >
          <Select.Control className={selectControlVariant()}>
            <Select.Trigger className={selectTriggerVariant()}>
              <Select.ValueText className="border border-neutral-800 h-8 px-4">
                {getCurrencyTitle(ctx, ctx.spy(createStoreItemCurrencyAtom))}
              </Select.ValueText>
            </Select.Trigger>
            <div className={selectIndicatorsVariant()}>
              <Select.ClearTrigger className={selectClearTriggerVariant()}>
                <IconX size={20} />
              </Select.ClearTrigger>
              <Select.Indicator className={selectIndicatorVariant()}>
                <IconSelector size={20} />
              </Select.Indicator>
            </div>
          </Select.Control>
          <Portal>
            <Select.Positioner>
              <Select.Content className={selectContentVariant()} style={selectContentBaseStyle}>
                <Select.ItemGroup className={selectItemGroupVariant()}>
                  {TYPE_ITEMS.map((item) => (
                    <Select.Item key={item.value} item={item} className={selectItemVariant()}>
                      <Select.ItemText className={selectItemTextVariant()}>
                        {item.title}
                      </Select.ItemText>
                      <Select.ItemIndicator className={selectItemIndicatorVariant()}>
                        <IconCheck size={16} />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.ItemGroup>
              </Select.Content>
            </Select.Positioner>
          </Portal>
          <Select.HiddenSelect />
        </Select.Root>
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