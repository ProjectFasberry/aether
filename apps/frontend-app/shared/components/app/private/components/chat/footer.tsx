import { reatomComponent } from "@reatom/npm-react";
import { chatCreate, chatCreateMessageAtom } from "../../models/chat.model";
import { Input } from "@/shared/ui/input";
import { IconBrandTelegram } from "@tabler/icons-react";
import { Button } from "@/shared/ui/button";

export const ChatCreateMessage = reatomComponent(({ ctx }) => {
  const isDisabled = !ctx.spy(chatCreateMessageAtom) || ctx.spy(chatCreate.submit.statusesAtom).isPending

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await chatCreate.submit(ctx)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-1 justify-between inert:opacity-50 inert:pointer-events-none w-full"
      inert={isDisabled}
    >
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
        className="h-10 min-w-10 min-h-10 w-10 p-0"
      >
        <IconBrandTelegram size={20} className="text-neutral-300" />
      </Button>
    </form>
  )
}, "ChatCreateMessage")
