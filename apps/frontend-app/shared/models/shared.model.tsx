import { client } from "../lib/client-wrapper"
import { action, atom, type AtomMut, type Ctx } from "@reatom/framework";
import { withAssign, withReset } from "@reatom/framework";
import { playerSeemsLikePlayersIsShowKey, playerSLPState } from "../components/app/player/models/player-seems-like.model";
import { parseBoolean } from "../lib/utils";
import { parseCookie } from "../lib/cookie-utils";
import type { PageContextServer } from "vike/types";
import { useInView } from "react-intersection-observer";
import { useUpdate } from "@reatom/npm-react";

type ExistNicknamePayload = ExtractApiData<"getValidateNicknameByNickname">["data"]
export async function getExistNickname(nickname: string) {
  return client<ExistNicknamePayload>(`validate/nickname/${nickname}`).exec()
}

export const pof = atom(null, "pof").pipe(
  withAssign((_, name) => ({
    showTokenVerifySectionAtom: atom(false, `${name}.showTokenVerifySection`).pipe(withReset()),
    token: atom<Nullable<string>>(null, `${name}.token`).pipe(withReset()),
    resetAll: action((ctx) => {
      pof.showTokenVerifySectionAtom.reset(ctx)
      pof.token.reset(ctx)
    })
  })),
);

type Target<T = unknown> = Record<string, {
  atom: (ctx: Ctx, atom: any) => void, validator?: (value: string | T) => T;
}>

const COOKIE_TARGETS: Target = {
  [playerSeemsLikePlayersIsShowKey]: {
    atom: playerSLPState.settings.isShow, validator: (v) => typeof v === "string" ? parseBoolean(v) : v
  }
};

export const initCookie = action((ctx: Ctx, headers: NonNullable<PageContextServer["headers"]>) => {
  const cookies = parseCookie(headers["cookie"]);
  if (!Object.keys(cookies).length) return;

  for (const [key, value] of Object.entries(cookies)) {
    const target = COOKIE_TARGETS[key as keyof typeof COOKIE_TARGETS];
    if (!target) continue;

    const final = target.validator?.(value) ?? value;
    target.atom(ctx, final);
  }
})

export const createViewerModel = ({ name, logging }: { name: string, logging?: boolean }) => {
  const inViewAtom = atom(false, `${name}.inViewAtom`);

  const Component = () => {
    const { ref, inView } = useInView({
      triggerOnce: false, threshold: 0
    })

    useUpdate((ctx) => inViewAtom(ctx, inView), [inView])

    return (
      <div ref={ref} className="h-px" />
    )
  }

  if (logging) {
    inViewAtom.onChange((_, state) => console.log(inViewAtom.__reatom.name, state))
  }

  return {
    Component,
    inViewAtom
  }
}
