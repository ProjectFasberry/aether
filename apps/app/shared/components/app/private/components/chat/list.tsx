import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { chatHistory, chatHistoryState } from "../../models/chat.model";
import { isEmptyArray } from "@/shared/lib/helpers";
import { Skeleton } from "@/shared/ui/skeleton";
import { ChatMessage } from "./message";

export const ChatMessages = reatomComponent(({ ctx }) => {
  useUpdate(chatHistory.fetch, [])

  if (ctx.spy(chatHistory.fetch.statusesAtom).isPending) {
    return Array.from({ length: 16 }).map((_, idx) => <Skeleton key={idx} className="h-36 w-full" />)
  }

  const data = ctx.spy(chatHistoryState.data)
  const error = ctx.spy(chatHistory.fetch.errorAtom);

  if (error) {
    return <span className="text-red">Произошла ошибка. {error.message}</span>
  }

  if (!data || isEmptyArray(data)) return <span>Сообщений нет</span>

  return data.map((item) => <ChatMessage key={item.id} {...item} />)
}, "ChatMessages")
