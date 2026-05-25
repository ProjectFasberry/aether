import { reatomComponent, useAtom } from "@reatom/npm-react";
import { chatWs } from "../models/chat.model";
import { Typography } from "@/shared/ui/typography"
import { createPageModel } from "@/shared/lib/events";
import { ChatMessages } from "./chat/list";
import { ChatCreateMessage } from "./chat/footer";

const page = createPageModel({
  name: "chat",
  onConnAction: (ctx) => {
    chatWs.init(ctx)
  },
  onDisconnAction: (ctx, dataAtom) => {
    chatWs.closeWs(ctx)
  },
})

const ChatHeader = () => {
  return (
    <div className="flex items-center justify-between w-full">
      <Typography className="text-xl font-semibold">Чат</Typography>
    </div>
  )
}
const ChatBody = () => {
  return (
    <div className="flex flex-col flex-1 pb-2 overflow-hidden w-full">
      <div className="flex flex-col overflow-y-auto gap-2 scrollbar scrollbar-thumb-neutral-800">
        <ChatMessages />
      </div>
    </div>
  )
}
const ChatFooter = reatomComponent(({ ctx }) => {
  return (
    <div className="flex sticky bottom-2 w-full z-2">
      <ChatCreateMessage />
    </div>
  )
})

export const Chat = () => {
  const [_] = useAtom(page.dataAtom);

  return (
    <div className="flex flex-col gap-4 w-full overflow-hidden h-[90vh]">
      <ChatHeader />
      <ChatBody />
      <ChatFooter />
    </div>
  )
}
