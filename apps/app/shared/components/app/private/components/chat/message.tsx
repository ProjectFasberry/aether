import { action, type Action, type Atom, type CtxSpy } from "@reatom/framework";
import { chatMessageModel, type ChatItem, type ChatItemViews } from "../../models/chat.model";
import { reatomComponent } from "@reatom/npm-react";
import { currentUserState } from "@/shared/models/current-user/index.model";
import { createLink, Link } from "@/shared/components/config/link";
import { Avatar } from "@/shared/ui/avatar";
import { Portal } from "@ark-ui/react/portal";
import { Menu } from "@ark-ui/react/menu";
import { dropdownMenuItemVariants, menuContentVariant } from "@/shared/ui/menu";
import { IconCheck, IconChecks, IconCopy, IconPencil, IconTrash } from "@tabler/icons-react";
import { Input } from "@/shared/ui/input";
import { Typography } from "@/shared/ui/typography";
import { ActionButton, DeleteButton } from "../ui";
import dayjs from "@/shared/lib/create-dayjs";
import { Skeleton } from "@/shared/ui/skeleton";
import { Fragment, type ReactNode } from "react";

const { msgViews, msgCopyText, getChatItemIsEditAtom, getChatItemViews, msgEditState, msgEdit, msgDelete } = chatMessageModel()

const ChatMessagesItemText = reatomComponent<Pick<ChatItem, "id" | "message">>(({ ctx, id, message }) => {
  const isEdit = ctx.spy(getChatItemIsEditAtom(id))

  return (
    <div className="min-w-0 w-full">
      {isEdit ? (
        <Input
          value={ctx.spy(msgEditState.newMsg) ?? message}
          onChange={e => msgEditState.newMsg(ctx, e.target.value)}
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

  const isDisabled = !ctx.spy(msgEdit.isValid) || ctx.spy(msgEdit.submit.statusesAtom).isPending

  return (
    <div className="flex items-center gap-1">
      <ActionButton
        variant="selected"
        icon={IconCheck}
        disabled={isDisabled}
        onClick={() => msgEdit.submit(ctx)}
      />
      <DeleteButton onClick={() => msgEdit.end(ctx)} />
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
          <span className="text-sm text-neutral-400">
            {dayjs(created_at).format("DD.MM.YYYY hh:mm")}
          </span>
        </div>
      </div>
    </div>
  )
}
const ChatMessageViewsMenu = reatomComponent<{ id: number }>(({ ctx, id }) => {
  const data = ctx.spy(getChatItemViews(id));

  return (
    <Menu.Root>
      <Menu.TriggerItem className={dropdownMenuItemVariants()}>
        <IconChecks size={16} />
        {ctx.spy(msgViews.fetch.statusesAtom).isPending
          ? <Skeleton className="h-5 w-5" /> : data.length
        }
        <span>просмотров</span>
      </Menu.TriggerItem>
      <Portal>
        <Menu.Positioner>
          <Menu.Content className={menuContentVariant()}>
            {data.map((viewer) => (
              <ChatMessagesItemViewsItem key={viewer.id} {...viewer} />
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}, "ChatMessageViewsMenu")

type MessageAction = {
  label: string | ((ctx: CtxSpy, dataAtom: Atom<any>) => ReactNode),
  value: string,
  icon: any,
  action: Action<[id: number], Promise<void> | void> | null,
  nested?: {
    component: (id: number) => ReactNode
  },
  onlyOwner?: boolean,
  style?: {
    variant: "default" | "danger"
  }
}

const MESSAGE_ACTIONS_LIST: MessageAction[] = [
  {
    label: "Редактировать",
    value: "edit",
    icon: IconPencil,
    action: msgEdit.start
  },
  {
    label: "Скопировать текст",
    value: "copy-text",
    icon: IconCopy,
    action: msgCopyText
  },
  {
    label: (ctx, dataAtom: Atom<string[]>) => ctx.spy(msgViews.fetch.statusesAtom).isPending
      ? <Skeleton className="h-5 w-5" /> : ctx.spy(dataAtom).length.toString(),
    value: "views",
    icon: IconChecks,
    action: null,
    nested: {
      component: (id) => <ChatMessageViewsMenu id={id} />
    }
  },
  {
    label: "Удалить",
    value: "delete",
    icon: IconTrash,
    action: msgDelete.submit,
    onlyOwner: true,
    style: { variant: "danger" }
  },
]

const onOpenContextMenu = action((ctx, id: number) => {
  msgViews.fetch(ctx, id)
})
const onSelectContextMenu = action((ctx, id: number, value: string) => {
  const msgAction = MESSAGE_ACTIONS_LIST.find(d => d.value === value)
  if (!msgAction) {
    console.warn("Message action is not defined")
    return;
  }
  if (!msgAction.action) {
    console.warn(`Action for event ${value} is null`)
    return;
  }
  msgAction.action(ctx, id)
})

export const ChatMessage = reatomComponent<ChatItem>(({
  ctx, id, nickname, avatar, created_at, message, edited, edited_at, views
}) => {
  const isOwner = nickname === ctx.get(currentUserState)?.nickname

  return (
    <Menu.Root
      onOpenChange={({ open }) => open ? onOpenContextMenu(ctx, id) : undefined}
      onSelect={({ value }) => onSelectContextMenu(ctx, id, value)}
    >
      <Menu.ContextTrigger
        id={id.toString()}
        className="flex flex-col items-start gap-1 border p-2 border-neutral-800 rounded-lg w-full"
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
        </div>
      </Menu.ContextTrigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content className={menuContentVariant()}>
            {MESSAGE_ACTIONS_LIST.map((item) => {
              if (item.onlyOwner && !isOwner) return null;

              const label = typeof item.label === 'function' ? item.label(ctx, getChatItemViews(id)) : item.label

              if (item.nested) {
                const Component = item.nested.component(id);
                return <Fragment key={item.value}>{Component}</Fragment>
              }

              return (
                <Menu.Item
                  key={item.value}
                  value={item.value}
                  className={dropdownMenuItemVariants({ className: item.style?.variant === 'danger' ? "text-red" : "" })}
                >
                  <item.icon size={16} />
                  {typeof item.label === 'function' ? label : <span>{label}</span>}
                </Menu.Item>
              )
            })}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}, "ChatMessagesItem")
