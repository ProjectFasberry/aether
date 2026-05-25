import { env } from "@/shared/env";
import { client } from "@/shared/lib/client-wrapper";
import { logError } from "@/shared/lib/log";
import { reatomAsync, withCache, withErrorAtom, withStatusesAtom } from "@reatom/framework";
import { action, atom, batch, type Ctx } from "@reatom/framework";
import { reatomMap, withAssign, withReset } from "@reatom/framework";
import * as z from "zod";

type ChatEventVariant = 'create' | 'edit' | 'delete'

export type ChatItem = {
  id: number
  created_at: string
  edited: boolean
  edited_at: string | null
  message: string
  nickname: string,
  avatar: string,
  views: number
}

type ChatEvent<T = unknown> = {
  event: ChatEventVariant
  data: T
}

const chatDataMapAtom = reatomMap<number, ChatItem>();
const chatWsAtom = atom<WebSocket | null>(null).pipe(withReset());

export const chatWs = atom(null, "chatWs").pipe(
  withAssign(() => ({
    init: action((ctx) => {
      chatWs.closeWs(ctx)
      const socket = new WebSocket(`${env.VITE_API_URL!.replace(/^http/, 'ws') + '/privated/chat/subscribe'}`)
      chatWsAtom(ctx, socket)
    }),
    closeWs: action((ctx) => {
      const current = ctx.get(chatWsAtom)
      if (!current) return;

      current.close()
      chatWsAtom.reset(ctx)
    }),
    getSocket: action((ctx) => {
      const socket = ctx.get(chatWsAtom)
      if (!socket) throw new Error('Socket is not defined')
      return socket;
    }),
    deleteItem: action((ctx, data: unknown) => {
      const di = data as { id: number }
      chatDataMapAtom.delete(ctx, di.id)
    }),
    addItem: action((ctx, data: unknown) => {
      const ci = data as ChatItem
      chatDataMapAtom.set(ctx, ci.id, ci)
    }),
    editItem: action((ctx, data: unknown) => {
      const ei = data as ChatItem
      chatDataMapAtom.set(ctx, ei.id, ei)
    })
  }))
)

const EVENTS: Record<ChatEventVariant, (ctx: Ctx, data: unknown) => void> = {
  "create": (ctx, data) => chatWs.addItem(ctx, data),
  "delete": (ctx, data) => chatWs.deleteItem(ctx, data),
  "edit": (ctx, data) => chatWs.editItem(ctx, data)
}

chatWsAtom.onChange((ctx, state) => {
  if (!state) return;

  state.onopen = () => { }
  state.onclose = () => { }

  state.onmessage = (event: MessageEvent<any>) => {
    const msg = JSON.parse(event.data) as ChatEvent
    const data = msg.data;

    const cb = EVENTS[msg.event]
    cb(ctx, data)
  }
})

export type ChatItemViews = {
  created_at: Date;
  id: number;
  nickname: string;
  message_id: number;
  avatar: string
}

export const chatHistoryState = atom(null, "chatHistoryState").pipe(
  withAssign(() => ({
    data: atom<ChatItem[] | null>((ctx) => Array.from(ctx.spy(chatDataMapAtom).values())),
    meta: atom<PaginatedMeta | null>(null)
  }))
)
export const chatHistory = atom(null, "chatHistory").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client<{ data: ChatItem[], meta: PaginatedMeta }>("privated/chat/list").exec()
      )
    }, {
      name: `${name}.fetch`,
      onFulfill: (ctx, res) => {
        batch(ctx, () => {
          chatDataMapAtom(ctx, new Map(res.data.map((e) => [e.id, e])))
          chatHistoryState.meta(ctx, res.meta)
        })
      },
      onReject: (_, e) => logError(e)
    }).pipe(
      withStatusesAtom(),
      withErrorAtom()
    )
  }))
)

export const chatCreateMessageAtom = atom<string>("").pipe(withReset())

export const chatCreate = atom(null, "chatCraete").pipe(
  withAssign((_, name) => ({
    submit: reatomAsync(async (ctx) => {
      const payload: ChatEvent<{ message: string }> = {
        event: "create",
        data: { message: ctx.get(chatCreateMessageAtom) }
      }

      const payloadStr = JSON.stringify(payload)
      const socket = chatWs.getSocket(ctx)
      socket.send(payloadStr)
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx) => msgDelete.atomsReset(ctx),
      onReject: (_, e) => logError(e)
    }).pipe(
      withStatusesAtom(),
      withErrorAtom()
    )
  }))
)

const msgDelete = atom(null, "msgDelete").pipe(
  withAssign((ctx, name) => ({
    atomsReset: action((ctx) => {
      chatCreateMessageAtom.reset(ctx)
    }, `${name}.atomsReset`),
    submit: reatomAsync(async (ctx, id: number) => {
      const payload: ChatEvent<{ id: number }> = {
        event: "delete",
        data: { id }
      }

      const socket = chatWs.getSocket(ctx)
      const payloadStr = JSON.stringify(payload)
      socket.send(payloadStr)
    }, `${name}.submit`).pipe(
      withStatusesAtom(),
      withErrorAtom()
    )
  }))
)

const msgEditState = atom(null, "msgEditState").pipe(
  withAssign(() => ({
    msgId: atom<Nullable<number>>(null).pipe(withReset()),
    newMsg: atom<Nullable<string>>(null).pipe(withReset()),
    oldMsg: atom<string>("").pipe(withReset())
  }))
)

const getChatItemIsEditAtom = (id: number) => atom((ctx) => ctx.spy(msgEditState.msgId) === id);

const equalSchema = z.object({ oldMsg: z.string(), newMsg: z.string() })

const msgEdit = atom(null, "msgEdit").pipe(
  withAssign((_, name) => ({
    start: action((ctx, id) => {
      const currentMessage = ctx.get(chatHistoryState.data)?.find(d => d.id === id)?.message
      if (!currentMessage) throw new Error("current message is not defined")

      msgEditState.msgId(ctx, id)
      msgEditState.oldMsg(ctx, currentMessage)
    }),
    end: action((ctx) => {
      msgEditState.msgId.reset(ctx)
      msgEditState.newMsg.reset(ctx)
      msgEditState.oldMsg.reset(ctx)
    }),
    messageIsValid: atom<boolean>((ctx) => {
      const { success } = equalSchema.safeParse({ oldMsg: ctx.spy(msgEditState.oldMsg), newMsg: ctx.spy(msgEditState.newMsg) })
      return success;
    }),
    isValid: atom((ctx) => {
      const isIdentity = ctx.spy(msgEdit.messageIsValid)

      if (!isIdentity) {
        return z.safeParse(z.string().min(1), ctx.get(msgEditState.newMsg)).success
      }

      return false
    }),
    atomsReset: action((ctx) => {
      msgEditState.msgId.reset(ctx)
      msgEditState.newMsg.reset(ctx)
      msgEditState.oldMsg.reset(ctx)
    }),
    submit: reatomAsync(async (ctx) => {
      const id = ctx.get(msgEditState.msgId);
      if (!id) throw new Error("Id is not defined");

      const message = ctx.get(msgEditState.newMsg)
      if (!message) throw new Error("message is not defined");

      const payload: ChatEvent<{ id: number, message: string }> = {
        event: "edit",
        data: { id, message }
      }

      const payloadStr = JSON.stringify(payload)
      const socket = chatWs.getSocket(ctx)
      socket.send(payloadStr)
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx) => msgEdit.atomsReset(ctx),
      onReject: (_, e) => logError(e)
    }).pipe(
      withStatusesAtom(),
      withErrorAtom()
    )
  }))
)

const chatItemViewsAtom = reatomMap<number, ChatItemViews[]>()
const getChatItemViews = (id: number) => atom((ctx) => ctx.spy(chatItemViewsAtom).get(id) ?? [])

const msgViews = atom(null).pipe(
  withAssign(() => ({
    fetch: reatomAsync(async (ctx, id: number) => {
      return await ctx.schedule(() =>
        client<{ data: ChatItemViews[], meta: PaginatedMeta }>(`privated/chat/${id}/views`).exec()
      )
    }, {
      name: "chatItemViewsAction",
      onFulfill: (ctx, res) => chatItemViewsAtom(ctx, new Map(res.data.map(e => [e.message_id, res.data]))),
      onReject: (_, e) => logError(e)
    }).pipe(
      withStatusesAtom(),
      withErrorAtom(),
      withCache({ swr: false })
    )
  }))
)

const msgCopyText = action(async (ctx, id: number) => {
  const history = ctx.get(chatHistoryState.data)
  if (!history) return;

  const msg = history.find(m => m.id === id);
  if (!msg) return;

  await navigator.clipboard.writeText(msg.message)
})

export const chatMessageModel = () => {
  return {
    msgViews,
    msgEdit,
    msgDelete,
    msgEditState,
    msgCopyText,
    getChatItemViews,
    getChatItemIsEditAtom
  }
}
