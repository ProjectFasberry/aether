import dayjs from "@/shared/lib/create-dayjs";
import { reatomComponent, useAtom, useUpdate } from "@reatom/npm-react";
import {
  chatCreate, chatCreateMessageAtom, chatHistory, chatHistoryState, chatEditState,
  chatEdit, getChatItemIsEditAtom, chatItemViewsAction, getChatItemViews, type ChatItem, chatDisabledAtom,
  type ChatItemViews, chatWs, chatDelete
} from "../models/chat.model";
import { Button } from "@/shared/ui/button";
import { IconBrandTelegram, IconCheck, IconDotsVertical, IconEye, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import { Input } from "@/shared/ui/input";
import { isEmptyArray } from "@/shared/lib/helpers";
import { Avatar } from "../../../../ui/avatar";
import { Typography } from "@/shared/ui/typography"
import { createLink, Link } from "@/shared/components/config/link";
import { ActionButton, DeleteButton } from "./ui";
import { currentUserState } from "@/shared/models/current-user/index.model";
import { createPageModel } from "@/shared/lib/events";
import { atom } from "@reatom/framework";
import { Menu } from '@ark-ui/react/menu'
import { dropdownMenuItemVariants, menuArrowTipVariant, menuArrowVariant, menuContentVariant, menuTriggerVariant } from "@/shared/ui/menu";

const ChatMessagesItemActions = reatomComponent<Pick<ChatItem, "id">>(({ ctx, id }) => {
  return (
    <Menu.Root>
      <Menu.Trigger className={menuTriggerVariant()}>
        <Menu.Indicator>
          <IconDotsVertical size={14} className="text-neutral-400" />
        </Menu.Indicator>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content className={menuContentVariant()}>
          <Menu.Arrow className={menuArrowVariant()}>
            <Menu.ArrowTip className={menuArrowTipVariant()} />
          </Menu.Arrow>
          <div className="flex flex-col text-sm gap-2 w-full h-full">
            <Typography className="text-neutral-400">Действия</Typography>
            <div className="flex flex-col gap-1 w-full">
              <Menu.Item
                value="delete"
                disabled={ctx.spy(chatDelete.submit.statusesAtom).isPending}
                onClick={() => chatDelete.submit(ctx, id)}
                className={dropdownMenuItemVariants()}
              >
                <IconTrash size={16} />
                Удалить
              </Menu.Item>
              <Menu.Item
                value="edit"
                onClick={() => chatEdit.start(ctx, id)}
                className={dropdownMenuItemVariants()}
              >
                <IconPencil size={16} />
                Изменить
              </Menu.Item>
            </div>
          </div>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  )
}, "ChatMessagesItemActions")

const ChatMessagesItemText = reatomComponent<Pick<ChatItem, "id" | "message">>(({ ctx, id, message }) => {
  const isEdit = ctx.spy(getChatItemIsEditAtom(id))

  return (
    <div className="min-w-0 w-full">
      {isEdit ? (
        <Input
          value={ctx.spy(chatEditState.newMsg) ?? message}
          onChange={e => chatEditState.newMsg(ctx, e.target.value)}
          className="focus-within:outline-none! p-0! text-base! w-full"
        />
      ) : (
        <Typography className='truncate'>{message}</Typography>
      )}
    </div>
  )
}, "ChatMessagesItemText")

const ChatMessagesItemEditActions = reatomComponent<Pick<ChatItem, "id">>(({ ctx, id }) => {
  const isEdit = ctx.spy(getChatItemIsEditAtom(id))
  if (!isEdit) return null;

  const isDisabled = !ctx.spy(chatEdit.isValid) || ctx.spy(chatEdit.submit.statusesAtom).isPending

  return (
    <div className="flex items-center gap-1">
      <ActionButton
        variant="selected"
        icon={IconCheck}
        disabled={isDisabled}
        onClick={() => chatEdit.submit(ctx)}
      />
      <DeleteButton onClick={() => chatEdit.end(ctx)} />
    </div>
  )
}, "ChatMessagesItemEditActions")

const ChatMessagesItemViewsItem = ({
  id, nickname, created_at, avatar
}: ChatItemViews) => {
  return (
    <div className="flex border border-neutral-800 gap-2 rounded-lg px-2 py-1 items-center">
      <Avatar url={avatar} className="w-8 h-8" nickname={nickname} />
      <div className="flex flex-col">
        {nickname}
        <div className="flex items-center justify-start gap-1">
          <IconCheck size={14} className="text-neutral-400" />
          <span className="text-sm text-neutral-400">
            {dayjs(created_at).format("DD.MM.YYYY hh:mm")}
          </span>
        </div>
      </div>
    </div>
  )
}

const openAtom = atom(false);

const ChatMessagesItemViews = reatomComponent<Pick<ChatItem, "id" | "views">>(({ ctx, id, views }) => {
  useUpdate((ctx) => {
    const un = ctx.subscribe(openAtom, (state) => {
      if (state) {
        chatItemViewsAction(ctx, id)
      }
    })

    return un
  }, [])

  const data = ctx.spy(getChatItemViews(id))

  return (
    <Menu.Root>
      <Menu.Trigger>
        <div className="flex items-center gap-1">
          <IconEye size={14} />
          <span>{views ?? 0}</span>
        </div>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content>
          <Menu.Arrow>
            <Menu.ArrowTip />
          </Menu.Arrow>
          <div className="flex flex-col gap-1 w-full">
            {data.map((item) => <ChatMessagesItemViewsItem key={item.id} {...item} />)}
          </div>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  )
}, "ChatMessagesItemViews")

const ChatMessagesItem = reatomComponent<ChatItem>(({
  ctx, id, nickname, avatar, created_at, message, edited, edited_at, views
}) => {
  const isOwner = nickname === ctx.get(currentUserState)?.nickname

  return (
    <div
      id={id.toString()}
      className="flex flex-col gap-1 border p-2 border-neutral-800 rounded-lg w-full"
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <Link href={createLink("player", nickname)}>
            <Avatar nickname={nickname} className="h-5 w-5" url={avatar} />
          </Link>
          <Link href={createLink("player", nickname)}>{nickname}</Link>
          <span
            title={dayjs(created_at).format("DD.MM.YYYY hh:mm")}
            className="text-neutral-400 text-sm"
          >
            {dayjs(created_at).fromNow()}
          </span>
        </div>
        {isOwner && <ChatMessagesItemActions id={id} />}
      </div>
      <div className="flex items-center gap-2 justify-between">
        <ChatMessagesItemText id={id} message={message} />
        <ChatMessagesItemEditActions id={id} />
      </div>
      <div className="flex items-center text-neutral-400 text-sm justify-end gap-3">
        {edited && (
          <div className="flex items-center">
            <span title={dayjs(edited_at).format("DD.HH.MM hh:mm")}>изм.</span>
          </div>
        )}
        <ChatMessagesItemViews views={views} id={id} />
      </div>
    </div >
  )
}, "ChatMessagesItem")

export const ChatMessages = reatomComponent(({ ctx }) => {
  useUpdate(chatHistory.fetch, [])

  const data = ctx.spy(chatHistoryState.data)
  const error = ctx.spy(chatHistory.fetch.errorAtom);

  if (error) {
    return <span className="text-red">Произошла ошибка. {error.message}</span>
  }

  if (!data || isEmptyArray(data)) return <span>Сообщений нет</span>

  return data.map((item) => <ChatMessagesItem key={item.id} {...item} />)
}, "ChatMessages")

const ChatCreateMessage = reatomComponent(({ ctx }) => {
  const isDisabled = !ctx.spy(chatCreateMessageAtom) || ctx.spy(chatCreate.submit.statusesAtom).isPending

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    chatCreate.submit(ctx)
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-1 justify-between w-full">
      <Input
        value={ctx.spy(chatCreateMessageAtom)}
        onChange={e => chatCreateMessageAtom(ctx, e.target.value)}
        maxLength={2025}
        placeholder="Напишите что-нибудь"
        className="h-10 w-full"
      />
      <Button
        type="submit"
        background="default"
        disabled={isDisabled}
        className="h-10 min-w-10 min-h-10 w-10 p-0"
      >
        <IconBrandTelegram size={20} className="text-neutral-300" />
      </Button>
    </form>
  )
}, "ChatCreateMessage")

const page = createPageModel({
  name: "chat",
  onSpyAction: (ctx, dataAtom, disabled) => {
    if (!disabled) {
      chatWs.init(ctx)
    }
  },
  onDisconnAction: (ctx, dataAtom) => {
    chatWs.closeWs(ctx)
  },
  spyedAtom: chatDisabledAtom
})

export const Chat = reatomComponent(({ ctx }) => {
  const [_] = useAtom(page.dataAtom);

  const disabled = ctx.spy(chatDisabledAtom)

  if (disabled) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button background="default" className="w-full font-semibold" onClick={() => chatDisabledAtom(ctx, false)}>
          Показать чат
        </Button>
      </div>
    )
  }

  return (
    <div className="flex fixed bottom-4 z-50 right-4 flex-col gap-2 bg-neutral-950 border border-neutral-900 rounded-xl w-[400px] h-2/4">
      <div className="flex px-4 items-center py-2 justify-between w-full">
        Чат
        <Button className="p-0" onClick={() => chatDisabledAtom(ctx, true)}>
          <IconX size={14} />
        </Button>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        <div className="flex-1 overflow-y-auto p-2 gap-2 scrollbar scrollbar-thumb-neutral-800">
          <ChatMessages />
        </div>
        <div className="flex-shrink-0 p-2">
          <ChatCreateMessage />
        </div>
      </div>
    </div>
  )
}, "Chat")