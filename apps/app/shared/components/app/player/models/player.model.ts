import { currentUserState } from "@/shared/models/current-user.model"
import { atom } from "@reatom/framework"
import { withAssign, withReset } from "@reatom/framework"
import { client } from "@/shared/lib/client-wrapper"
import { createSsrModel } from "@/shared/models/snapshot"

type Player = ExtractApiData<"getServerPlayerByNickname">["data"]
export type PlayerOmitted = Omit<Player, "rate">

export const playerSsrModel = createSsrModel({ name: "player", subscribe: false })

export const playerState = atom(null, "playerState").pipe(
  withAssign((_, name) => ({
    data: atom<Nullable<PlayerOmitted>>(null, `${name}.data`).pipe(playerSsrModel.withSsr(`${name}.data`), withReset()),
    nickname: atom<Nullable<string>>(null, `${name}.nickname`).pipe(playerSsrModel.withSsr(`${name}.nickname`), withReset())
  }))
)

export const isIdentityAtom = atom<boolean>((ctx) => {
  const currentUser = ctx.spy(currentUserState)
  if (!currentUser) return false;

  const targetNickname = ctx.spy(playerState.nickname)
  if (!targetNickname) return false;

  return targetNickname === currentUser.nickname;
})

export async function getPlayer(nickname: string, init: RequestInit) {
  return client<Player>(`server/player/${nickname}`, init).exec()
}