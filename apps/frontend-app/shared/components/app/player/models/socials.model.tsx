import { client } from "@/shared/lib/client-wrapper"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework"
import { isEmptyArray } from "@/shared/lib/helpers"
import { toast } from "sonner"
import { action, atom, withAssign } from "@reatom/framework"
import { playerState } from "./player.model"

type PlayerSocialsPayload = ExtractApiData<"getServerSocialsListByNickname">["data"];
export type PlayerSocialsItem = PlayerSocialsPayload[number];

export async function getPlayerSocials(nickname: string, init?: RequestInit) {
  return client<PlayerSocialsPayload>(`server/socials/list/${nickname}`, { ...init }).exec()
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

type SocialEventMap = {
  link: (value: PlayerSocialsItem["value"]) => string
  fn: (value: PlayerSocialsItem["value"]) => void
};

type SocialEvent = {
  [K in keyof SocialEventMap]: { type: K; cb: SocialEventMap[K] }
}[keyof SocialEventMap];

export const SOCIAL_EVENTS: Record<string, SocialEvent> = {
  telegram: {
    type: "link",
    cb: (value) => "https://t.me/" + value
  },
  discord: {
    type: "fn",
    cb: (value) => {
      navigator.clipboard.writeText(value)
      toast.info("Скопировано в буфер обмена")
    }
  }
}
