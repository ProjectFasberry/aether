import { DeleteButton, EditButton, ToLink } from "@/shared/components/app/private/components/ui"
import { itemToEditAtom, editStoreItem, deleteStoreItem, storeState, storeItems, createStoreItem } from "@/shared/components/app/private/models/store.model"
import { EditorMenuBar } from "@/shared/components/config/editor/editor"
import { createLink } from "@/shared/components/config/link"
import { atom, type AtomState } from "@reatom/framework"
import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Button } from "@/shared/ui/button"
import { Skeleton } from "@/shared/ui/skeleton"
import { Typography } from "@/shared/ui/typography"
import { IconArrowLeft, IconPlus } from "@tabler/icons-react"
import { type PropsWithChildren, type ReactNode } from "react"
import { navigate } from "vike/client/router"
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react"
import { belkoinImage, charismImage } from "@/shared/consts/images"
import { getFromDictionary } from "@/shared/models/app/utils"
import { CreateItem } from "./store.create"
import { type StoreItem as StoreItemProps } from "../../shop/models/store-item.model"
import { editorExtensions } from "@/shared/components/config/editor/editor.model"

const titles: Record<AtomState<typeof storeState.searchParamTarget>, string> = {
  "create": "Создание товара",
  "edit": "Редактирование товара",
  "view": "Просмотр товаров"
}

const headerTitleAtom = atom((ctx) => titles[ctx.spy(storeState.searchParamTarget)], "headerTitle")
const backIsVisibleAtom = atom((ctx) => !!ctx.spy(storeState.searchParamTarget), "backIsVisible")

const StoreItem = reatomComponent<StoreItemProps>(({ ctx, imageUrl, description, title, id, ...base }) => {
  const item = { imageUrl, description, title, id, ...base }

  return (
    <div className="flex items-center border border-neutral-800 gap-2 sm:gap-4 justify-between px-2 sm:px-4 py-2 w-full h-18 rounded-lg">
      <div className="flex items-center gap-2 overflow-hidden">
        <img src={imageUrl} alt="" className="hidden sm:block object-cover min-h-10 min-w-10 h-10 w-10" />
        <div className="flex flex-col min-w-0 w-full">
          <Typography className="text-nowrap truncate ">
            {title}
          </Typography>
          <Typography className='text-neutral-400 text-sm text-nowrap truncate'>
            {description}
          </Typography>
        </div>
      </div>
      <div className="flex items-center gap-2 h-full w-fit">
        <div className="flex items-center border border-neutral-800 p-1 rounded-lg gap-1">
          <ToLink
            link={createLink("store", id)}
          />
          <EditButton
            onClick={() => navigate(`/private/store?target=edit&id=${id}`)}
          />
          <DeleteButton
            onClick={() => deleteStoreItem.before(ctx, item)}
          />
        </div>
      </div>
    </div>
  )
}, "StoreItem")

const StoreCreateItem = () => {
  return (
    <Button
      className="h-8 w-fit items-center gap-2 justify-center px-4 border border-neutral-800"
      onClick={() => navigate("/private/store?target=create")}
    >
      <Typography className="font-semibold text-lg text-neutral-50">
        Создать
      </Typography>
      <IconPlus size={18} />
    </Button>
  )
}

const StoreItemsSkeleton = () => Array.from({ length: 12 }).map((_, idx) => <Skeleton key={idx} className="h-18 w-full" />)

const StoreItems = reatomComponent(({ ctx }) => {
  useUpdate(storeItems.fetch, []);

  const data = ctx.spy(storeItems.fetch.dataAtom)?.data;

  if (ctx.spy(storeItems.fetch.statusesAtom).isPending) {
    return <StoreItemsSkeleton />
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      {data.map((item) => <StoreItem key={item.id} {...item} />)}
    </div>
  )
}, "StoreItems")

const Wrapper = reatomComponent<PropsWithChildren>(({ ctx, children }) => {
  const isLoading =
    ctx.spy(deleteStoreItem.submit.statusesAtom).isPending ||
    ctx.spy(editStoreItem.submit.statusesAtom).isPending ||
    ctx.spy(createStoreItem.submit.statusesAtom).isPending;

  return (
    <div
      data-state={isLoading ? "loading" : "idle"}
      className="flex flex-col gap-4 w-full h-full
        data-[state=loading]:pointer-events-none data-[state=loading]:opacity-60 data-[state=idle]:pointer-events-auto"
    >
      {children}
    </div>
  )
}, "Wrapper")

const CURRENCY_IMAGE: Record<string, string> = {
  "CHARISM": charismImage,
  "BELKOIN": belkoinImage
}

const EditItem = reatomComponent(({ ctx }) => {
  const data = ctx.spy(itemToEditAtom);

  const editor = useEditor({
    extensions: editorExtensions,
  })

  useUpdate((ctx) => {
    if (!data) return;
    editor.commands.setContent(data.content as JSONContent)
  }, [data?.content, editor])

  if (ctx.spy(storeItems.fetch.statusesAtom).isPending) {
    return <Skeleton className="h-24 w-full" />
  }

  if (!data) {
    return <Typography>Товар не найден</Typography>;
  }

  const { id, content, title, currency, command, imageUrl, price, value, type, description } = data

  if (!content) throw new Error("Content is not defined")

  const currencyTitle = getFromDictionary(ctx, currency)

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <Typography className="text-2xl font-semibold">
        {title}
      </Typography>
      <div className="flex overflow-hidden h-40">
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className="object-cover w-auto h-full"
        />
      </div>
      <div className="flex flex-col gap-4 rounded-lg border border-neutral-800 w-full p-2">
        <EditorMenuBar editor={editor} />
        <EditorContent editor={editor} />
      </div>
      <div className="flex flex-wrap *:grow *:sm:grow-0 items-center gap-2 w-full justify-start">
        <div className="flex items-center gap-1 border px-2 py-1 border-neutral-800 rounded-lg">
          <Typography className="font-semibold">
            Цена: {price}
          </Typography>
          <img src={CURRENCY_IMAGE[currency]} alt="" width={20} height={20} />
        </div>
        <div className="flex items-center gap-1 border px-2 py-1 border-neutral-800 rounded-lg">
          <Typography className="font-semibold">
            Валюта: {currencyTitle}
          </Typography>
          <img src={CURRENCY_IMAGE[currency]} alt="" width={20} height={20} />
        </div>
        <div className="flex items-center gap-1 border px-2 py-1 border-neutral-800 rounded-lg">
          <Typography className="font-semibold">
            Тип товара: {type}
          </Typography>
        </div>
        <div className="flex items-center gap-1 border px-2 py-1 border-neutral-800 rounded-lg">
          <Typography className="font-semibold">
            Значение товара: {value}
          </Typography>
        </div>
        <div className="flex items-center gap-1 border px-2 py-1 border-neutral-800 rounded-lg">
          <Typography className="font-semibold">
            Команда выдачи товара: {command ?? "нет"}
          </Typography>
        </div>
      </div>
      <Button
        onClick={() => editStoreItem.submit(ctx, id)}
        disabled={ctx.spy(editStoreItem.submit.statusesAtom).isPending}
        className="bg-neutral-50 text-neutral-950 font-semibold text-lg self-end"
      >
        Применить изменения
      </Button>
    </div>
  )
}, "EditItem")

const COMPONENTS: Record<string, ReactNode> = {
  "create": <CreateItem />,
  "view": <StoreItems />,
  "edit": <EditItem />
}

const Back = reatomComponent(({ ctx }) => {
  const isVisible = ctx.spy(backIsVisibleAtom)
  if (!isVisible) return null;

  return (
    <Button
      className="p-0 h-8 w-8 aspect-square bg-neutral-800"
      onClick={() => window.history.back()}
    >
      <IconArrowLeft size={16} />
    </Button>
  )
}, "Back")

const StoreHeader = reatomComponent(({ ctx }) => {
  const title = ctx.spy(headerTitleAtom);

  return (
    <div className="flex items-center justify-between gap-1 w-full">
      <div className="flex gap-2 items-center justify-start w-full">
        <Back />
        <Typography className='text-lg font-semibold text-neutral-50'>
          {title}
        </Typography>
      </div>
      <StoreCreateItem />
    </div>
  )
}, "Header")

const Components = reatomComponent(({ ctx }) => COMPONENTS[ctx.spy(storeState.searchParamTarget)], "Components")

export const StorePrivated = () => {
  return (
    <Wrapper>
      <StoreHeader />
      <Components />
    </Wrapper>
  )
}
