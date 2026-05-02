import dayjs from "@/shared/lib/create-dayjs";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import {
  chatCreateMessageAction,
  chatCreateMessageAtom,
  chatDataAction,
  chatDataAtom,
  chatDeleteMessageAction,
  chatEditMessageAction,
  chatEditNewMessageAtom,
  chatEdit,
  getChatItemIsEditAtom,
  chatItemViewsAction,
  getChatItemViews,
  ChatItem,
  chatDisabledAtom,
  ChatItemViews,
  chatWs
} from "../models/chat.model";
import { Button } from "@repo/ui/button";
import {
  IconBrandTelegram,
  IconCheck,
  IconDotsVertical,
  IconEye,
  IconPencil,
  IconX
} from "@tabler/icons-react";
import { Input } from "@repo/ui/input";
import { isEmptyArray } from "@/shared/lib/utils";
import { Avatar } from "../../../../ui/avatar";
import { Typography } from "@repo/ui/typography";
import { createLink, Link } from "@/shared/components/config/link";
import { Skeleton } from "@repo/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { ActionButton, DeleteButton } from "./ui";
import { currentUserState } from "@/shared/models/current-user.model";

const ChatMessagesItemActions = reatomComponent<Pick<ChatItem, "id">>(({ ctx, id }) => {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="cursor-pointer">
        <IconDotsVertical size={18} className="text-neutral-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="left">
        <div className="flex flex-col gap-2 w-full h-full">
          <Typography className="text-neutral-400">
            Действия
          </Typography>
          <div className="flex flex-col gap-1 w-full">
            <DropdownMenuItem asChild className="p-0">
              <Button
                className="w-full gap-2 bg-neutral-800"
                disabled={ctx.spy(chatDeleteMessageAction.statusesAtom).isPending}
                onClick={() => chatDeleteMessageAction(ctx, id)}
              >
                <IconX size={16} />
                <Typography className="text-red">
                  Удалить
                </Typography>
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="p-0">
              <Button
                className="w-full gap-2 bg-neutral-800"
                onClick={() => chatEdit.start(ctx, id)}
              >
                <IconPencil size={16} />
                <Typography className="text-neutral-50">
                  Изменить
                </Typography>
              </Button>
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}, "ChatMessagesItemActions")

const ChatMessagesItemText = reatomComponent<Pick<ChatItem, "id" | "message">>(({ ctx, id, message }) => {
  const isEdit = ctx.spy(getChatItemIsEditAtom(id))

  return (
    <div className="min-w-0 w-full">
      {isEdit ? (
        <Input
          value={ctx.spy(chatEditNewMessageAtom) ?? message}
          onChange={e => chatEditNewMessageAtom(ctx, e.target.value)}
          className="focus-within:outline-none! p-0! text-base! w-full"
        />
      ) : (
        <Typography className='truncate'>
          {message}
        </Typography>
      )}
    </div>
  )
}, "ChatMessagesItemText")

const ChatMessagesItemEditActions = reatomComponent<Pick<ChatItem, "id">>(({ ctx, id }) => {
  const isEdit = ctx.spy(getChatItemIsEditAtom(id))
  if (!isEdit) return null;

  const isDisabled = !ctx.spy(chatEdit.isValid) || ctx.spy(chatEditMessageAction.statusesAtom).isPending

  return (
    <div className="flex items-center gap-1">
      <ActionButton
        variant="selected"
        icon={IconCheck}
        disabled={isDisabled}
        onClick={() => chatEditMessageAction(ctx)}
      />
      <DeleteButton onClick={() => chatEdit.end(ctx)} />
    </div>
  )
}, "ChatMessagesItemEditActions")

const ChatMessagesItemViewsItem = reatomComponent<ChatItemViews>(({
  ctx, id, nickname, created_at, avatar
}) => {
  return (
    <div
      className="flex border border-neutral-800 gap-2 rounded-lg px-2 py-1 items-center"
    >
      <Avatar
        url={avatar}
        className="w-8 h-8"
        nickname={nickname}
      />
      <div className="flex flex-col">
        <Typography className="text-neutral-50 text-base">
          {nickname}
        </Typography>
        <div className="flex items-center justify-start gap-1">
          <IconCheck size={14} className="text-neutral-400" />
          <span className="text-sm text-neutral-400">
            {dayjs(created_at).format("DD.MM.YYYY hh:mm")}
          </span>
        </div>
      </div>
    </div>
  )
}, "ChatMessagesItemViewsItem")

const ChatMessagesItemViews = reatomComponent<Pick<ChatItem, "id" | "views">>(({
  ctx, id, views
}) => {
  const [open, setOpen] = useState(false);

  useUpdate((ctx) => open && chatItemViewsAction(ctx, id), [open])

  const data = ctx.spy(getChatItemViews(id))

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger>
        <div className="flex items-center gap-1">
          <IconEye size={14} />
          <span>{views ?? 0}</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="flex flex-col gap-1 w-full">
          {data.map((item) => (
            <ChatMessagesItemViewsItem key={item.id} {...item} />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
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
            <Avatar
              nickname={nickname}
              className="h-5 w-5"
              url={avatar}
            />
          </Link>
          <Link href={createLink("player", nickname)}>
            <span>{nickname}</span>
          </Link>
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
            <span title={dayjs(edited_at).format("DD.HH.MM hh:mm")}>
              изм.
            </span>
          </div>
        )}
        <ChatMessagesItemViews views={views} id={id} />
      </div>
    </div >
  )
}, "ChatMessagesItem")

export const ChatMessages = reatomComponent(({ ctx }) => {
  useUpdate(chatDataAction, [])

  const data = ctx.spy(chatDataAtom)
  const error = ctx.spy(chatDataAction.errorAtom);

  if (ctx.spy(chatDataAction.statusesAtom).isPending) {
    return (
      <>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </>
    )
  }

  if (error) {
    return <span className="text-red">Произошла ошибка. {error.message}</span>
  }

  if (!data || isEmptyArray(data)) return <span>пусто</span>

  return data.map((item) => <ChatMessagesItem key={item.id} {...item} />)
}, "ChatMessages")

const ChatCreateMessage = reatomComponent(({ ctx }) => {
  const isDisabled = !ctx.spy(chatCreateMessageAtom)
    || ctx.spy(chatCreateMessageAction.statusesAtom).isPending

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => e.preventDefault();

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 justify-between w-full">
      <Input
        value={ctx.spy(chatCreateMessageAtom)}
        onChange={e => chatCreateMessageAtom(ctx, e.target.value)}
        maxLength={2025}
        placeholder="Напишите что-нибудь"
        className="h-10 w-full"
      />
      <Button
        type="submit"
        className="h-10 bg-neutral-800 w-10 p-0"
        disabled={isDisabled}
        onClick={() => chatCreateMessageAction(ctx)}
      >
        <IconBrandTelegram size={20} className="text-blue-500" />
      </Button>
    </form>
  )
}, "ChatCreateMessage")

const ChatShowButton = reatomComponent(({ ctx }) => {
  return (
    <Button
      className="w-full bg-neutral-900 text-lg font-semibold"
      onClick={() => chatDisabledAtom(ctx, false)}
    >
      Показать чат
    </Button>
  )
}, "ChatShowButton")

const Sync = reatomComponent(({ ctx }) => {
  const disabled = ctx.get(chatDisabledAtom);

  useEffect(() => {
    if (!disabled) {
      chatWs.init(ctx)
    }

    return () => {
      chatWs.closeWs(ctx)
    }
  }, [])

  return null
})

export const Chat = reatomComponent(({ ctx }) => {
  const disabled = ctx.spy(chatDisabledAtom)

  if (disabled) return <ChatShowButton />

  return (
    <div className="flex flex-col relative gap-2 bg-neutral-900 rounded-xl w-full h-[400px] sm:h-[700px]">
      <Sync />
      <div className="flex items-center p-4 justify-between w-full">
        <Typography className="text-xl font-semibold">Чат</Typography>
        <Button className="p-0" onClick={() => chatDisabledAtom(ctx, true)}>
          <IconX size={16} />
        </Button>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        <div className="flex-1 overflow-y-auto px-4 gap-2 scrollbar scrollbar-thumb-neutral-800">
          <ChatMessages />
        </div>
        <div className="flex-shrink-0 p-4">
          <ChatCreateMessage />
        </div>
      </div>
    </div>
  )
}, "Chat")