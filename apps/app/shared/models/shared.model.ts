import { client } from "../lib/client-wrapper"
import { action, atom } from "@reatom/core";
import { withAssign, withReset } from "@reatom/framework";

type ExistNicknamePayload = ExtractApiData<"getValidateNicknameByNickname">["data"]
export async function getExistNickname(nickname: string) {
  return client<ExistNicknamePayload>(`validate/nickname/${nickname}`).exec()
}

export const pof = atom(null, "pof").pipe(
  withAssign((_, name) => ({
    showTokenVerifySectionAtom: atom(false, `${name}.showTokenVerifySection`).pipe(withReset()),
    token: atom<Nullable<string>>(null, `${name}.token`).pipe(withReset()),
    resetState: action((ctx) => {
      pof.showTokenVerifySectionAtom.reset(ctx)
      pof.token.reset(ctx)
    })
  })),
);
