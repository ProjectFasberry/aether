import { client } from "@/shared/lib/client-wrapper"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework"
import { isEmptyArray } from "@/shared/lib/helpers"
import { type ReactNode } from "react"
import { toast } from "sonner"
import { Icon } from "@/shared/ui/icon"
import { action, atom, withAssign } from "@reatom/framework"
import { playerState } from "./player.model"

export type PlayerSocialsValuePayload = {
  id: string | number,
  username: string
}

export type PlayerSocialsPayload = {
  type: "telegram" | "discord",
  value: PlayerSocialsValuePayload
}

export async function getPlayerSocials(nickname: string, init?: RequestInit) {
  return client<PlayerSocialsPayload[]>(`server/socials/list/${nickname}`, { ...init }).exec()
}

export const playerSocials = atom(null, "playerSocials").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx, nickname: string) => {
      return await ctx.schedule(() =>
        getPlayerSocials(nickname, { signal: ctx.controller.signal })
      );
    }, `${name}.fetch`).pipe(
      withDataAtom([], (_, data) => isEmptyArray(data) ? null : data),
      withStatusesAtom(),
      withCache({ swr: false })
    ),
    init: action((ctx) => {
      const nickname = ctx.get(playerState.nickname)
      if (!nickname) return;

      playerSocials.fetch(ctx, nickname)
    })
  }))
)

playerState.nickname.onChange((ctx, state) => state && playerSocials.fetch(ctx, state))

export const SOCIAL_ICONS: Record<PlayerSocialsPayload["type"], () => ReactNode> = {
  telegram: () => <Icon name="sprite:telegram-icon" className="size-5" />,
  discord: () => <Icon name="sprite:discord-icon" className="size-5" />,
}

type SocialEventMap = {
  link: (value: PlayerSocialsValuePayload) => string
  fn: (value: PlayerSocialsValuePayload) => void
};

type SocialEvent = {
  [K in keyof SocialEventMap]: { type: K; cb: SocialEventMap[K] }
}[keyof SocialEventMap];

export const SOCIAL_EVENTS: Record<PlayerSocialsPayload["type"], SocialEvent> = {
  telegram: {
    type: "link",
    cb: (value) => "https://t.me/" + value.username
  },
  discord: {
    type: "fn",
    cb: (value) => {
      navigator.clipboard.writeText(value.username)
      toast.info("Скопировано в буфер обмена")
    }
  }
}