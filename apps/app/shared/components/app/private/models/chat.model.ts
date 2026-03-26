import { API_PREFIX_URL, isDevelopment } from "@/shared/env";
import { client } from "@/shared/lib/client-wrapper";
import { logError } from "@/shared/lib/log";
import { reatomAsync, withCache, withErrorAtom, withStatusesAtom } from "@reatom/async";
import { action, atom, batch, Ctx } from "@reatom/core";
import { onDisconnect, reatomMap, withAssign, withReset } from "@reatom/framework";
import { makeChangeValidator } from "../../shop/models/store-recipient.model";
import * as z from "zod/v4";
import { toast } from "sonner";
import { withLocalStorage } from "@reatom/persist-web-storage";

type ChatEventVariant = 'create' | 'edit' | 'delete'

export type ChatItem = {
  id: number
  created_at: string
  edited: boolean
  edited_at: string | null
  message: string
  nickname: string,
  views: number
}

type ChatEvent<T = unknown> = {
  event: ChatEventVariant
  data: T
}

const chatDataMapAtom = reatomMap<number, ChatItem>();

const chatWsAtom = atom<WebSocket | null>(null, "chatWs").pipe(withReset());

export const chatWs = atom(null, "chatWs").pipe(
  withAssign((ctx, name) => ({
    init: action((ctx) => {
      chatWs.closeWs(ctx)

      const socket = new WebSocket(`${API_PREFIX_URL!.replace(/^http/, 'ws') + '/privated/chat/subscribe'}`)
      chatWsAtom(ctx, socket)
    }, `${name}.init`),
    closeWs: action((ctx) => {
      const current = ctx.get(chatWsAtom)

      if (current) {
        current.close()
        chatWsAtom.reset(ctx)
      }
    }, `${name}.closeWs`),
    getSocket: action((ctx) => {
      const socket = ctx.get(chatWsAtom)
      if (!socket) throw new Error('Socket is not defined')
      return socket;
    }, `${name}.getSocket`),
    deleteItem: action((ctx, data: unknown) => {
      const di = data as { id: number }
      chatDataMapAtom.delete(ctx, di.id)
    }, `${name}.deleteItem`),
    addItem: action((ctx, data: unknown) => {
      const ci = data as ChatItem
      chatDataMapAtom.set(ctx, ci.id, ci)
    }, `${name}.addItem`),
    editItem: action((ctx, data: unknown) => {
      const ei = data as ChatItem
      chatDataMapAtom.set(ctx, ei.id, ei)
    }, `${name}.editItem`)
  }))
)

const EVENTS: Record<ChatEventVariant, (ctx: Ctx, data: unknown) => void> = {
  "create": (ctx, data) => chatWs.addItem(ctx, data),
  "delete": (ctx, data) => chatWs.deleteItem(ctx, data),
  "edit": (ctx, data) => chatWs.editItem(ctx, data)
}

chatWsAtom.onChange((ctx, state) => {
  if (!state) return;

  state.onopen = () => {
    if (isDevelopment) {
      toast.info("Connected to chat ws")
    }
  }

  state.onclose = () => {
    if (isDevelopment) {
      toast.info("Disconnected from chat ws")
    }
  }

  state.onmessage = (event: MessageEvent<any>) => {
    const msg = JSON.parse(event.data) as ChatEvent
    const data = msg.data;

    const cb = EVENTS[msg.event]
    cb(ctx, data)
  }
})

// 
export type ChatItemViews = {
  created_at: Date;
  id: number;
  nickname: string;
  message_id: number;
}

export const chatItemViewsAtom = reatomMap<number, ChatItemViews[]>()

export const getChatItemViews = (id: number) => atom((ctx) => ctx.spy(chatItemViewsAtom).get(id) ?? [])

export const chatItemViewsAction = reatomAsync(async (ctx, id: number) => {
  return await ctx.schedule(() =>
    client<{ data: ChatItemViews[], meta: PaginatedMeta }>(`privated/chat/${id}/views`).exec()
  )
}, {
  name: "chatItemViewsAction",
  onFulfill: (ctx, res) => chatItemViewsAtom(ctx, new Map(res.data.map(e => [e.message_id, res.data]))),
  onReject: (_, e) => logError(e)
}).pipe(withStatusesAtom(), withErrorAtom(), withCache({ swr: false }))

//
export const chatMetaAtom = atom<PaginatedMeta | null>(null, "chatMeta")
export const chatDataAtom = atom<ChatItem[] | null>((ctx) => Array.from(ctx.spy(chatDataMapAtom).values()), "chatData")

export const chatDataAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    client<{ data: ChatItem[], meta: PaginatedMeta }>("privated/chat/list").exec()
  )
}, {
  name: "chatDataAction",
  onFulfill: (ctx, res) => {
    batch(ctx, () => {
      chatDataMapAtom(ctx, new Map(res.data.map((e) => [e.id, e])))
      chatMetaAtom(ctx, res.meta)
    })
  },
  onReject: (_, e) => logError(e)
}).pipe(withStatusesAtom(), withErrorAtom())

// 
export const chatCreateMessageAtom = atom<string>("", "chatCreateMessage").pipe(withReset())

export const chatDelete = atom(null, "chatDelete").pipe(
  withAssign((ctx, name) => ({
    atomsReset: action((ctx) => {
      chatCreateMessageAtom.reset(ctx)
    }, `${name}.atomsReset`)
  }))
)

export const chatCreateMessageAction = reatomAsync(async (ctx) => {
  const payload: ChatEvent<{ message: string }> = {
    event: "create",
    data: { message: ctx.get(chatCreateMessageAtom) }
  }

  const payloadStr = JSON.stringify(payload)
  const socket = chatWs.getSocket(ctx)
  socket.send(payloadStr)
}, {
  name: "chatCreateMessageAction",
  onFulfill: (ctx) => chatDelete.atomsReset(ctx),
  onReject: (_, e) => logError(e)
}).pipe(withStatusesAtom(), withErrorAtom())

export const chatDeleteMessageAction = reatomAsync(async (ctx, id: number) => {
  const payload: ChatEvent<{ id: number }> = {
    event: "delete",
    data: { id }
  }

  const socket = chatWs.getSocket(ctx)
  const payloadStr = JSON.stringify(payload)
  socket.send(payloadStr)
}, {
  name: "chatDeleteMessageAction",
  onReject: (_, e) => logError(e)
}).pipe(withStatusesAtom(), withErrorAtom())

// 
export const chatEditMessageIdAtom = atom<Nullable<number>>(null, "chatEditMessageId").pipe(withReset())
export const chatEditNewMessageAtom = atom<Nullable<string>>(null, "chatEditNewMessage").pipe(withReset())
export const chatEditOldMessageAtom = atom<string>("", "chatEditOldMessage").pipe(withReset())

export const getChatItemIsEditAtom = (id: number) => atom((ctx) => ctx.spy(chatEditMessageIdAtom) === id, "getChatItemIsEdit");

export const chatEdit = atom(null, "chatEdit").pipe(
  withAssign((ctx, name) => ({
    start: action((ctx, id) => {
      const currentMessage = ctx.get(chatDataAtom)?.find(d => d.id === id)?.message
      if (!currentMessage) throw new Error("current message is not defined")

      chatEditMessageIdAtom(ctx, id)
      chatEditOldMessageAtom(ctx, currentMessage)
    }, `${name}.start`),
    end: action((ctx) => {
      chatEditMessageIdAtom.reset(ctx)
      chatEditNewMessageAtom.reset(ctx)
      chatEditOldMessageAtom.reset(ctx)
    }, `${name}.end`),
    messageIsValid: atom<boolean>(
      makeChangeValidator(chatEditOldMessageAtom, chatEditNewMessageAtom),
      `${name}.messageIsValid`
    ),
    isValid: atom((ctx) => {
      const isIdentity = ctx.spy(chatEdit.messageIsValid)

      if (!isIdentity) {
        return z.safeParse(z.string().min(1), ctx.get(chatEditNewMessageAtom)).success
      }

      return false
    }, `${name}.isValid`),
    atomsReset: action((ctx) => {
      chatEditMessageIdAtom.reset(ctx)
      chatEditNewMessageAtom.reset(ctx)
      chatEditOldMessageAtom.reset(ctx)
    }, `${name}.atomsReset`)
  }))
)

export const chatEditMessageAction = reatomAsync(async (ctx) => {
  const id = ctx.get(chatEditMessageIdAtom);
  if (!id) throw new Error("Id is not defined");

  const message = ctx.get(chatEditNewMessageAtom)
  if (!message) throw new Error("message is not defined");

  const payload: ChatEvent<{ id: number, message: string }> = {
    event: "edit",
    data: { id, message }
  }

  const payloadStr = JSON.stringify(payload)
  const socket = chatWs.getSocket(ctx)
  socket.send(payloadStr)
}, {
  name: "chatDeleteMessageAction",
  onFulfill: (ctx) => chatEdit.atomsReset(ctx),
  onReject: (_, e) => logError(e)
}).pipe(withStatusesAtom(), withErrorAtom())

export const chatDisabledAtom = atom(false, "chatDisabled").pipe(withLocalStorage({ key: "privated-chat-disabled" }))

chatDisabledAtom.onChange((ctx, state) => {
  if (state) {
    chatWs.closeWs(ctx)
  }
})