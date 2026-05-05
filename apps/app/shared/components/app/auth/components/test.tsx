import { reatomComponent } from "@reatom/npm-react";
import { useState } from "react";
import { registerNavigationModel, registerSeedPhraseModel } from "../models/register.model";
import { authState } from "../models/auth.model";
import { teststr } from "../models/auth-security.model";
import { action } from "@reatom/core";

const register = action(async (ctx, nickname: string) => {
  authState.type(ctx, "register")
  await new Promise(r => setTimeout(r, 1000))
  authState.fields.nickname(ctx, nickname)
  authState.fields.password(ctx, nickname)
  authState.fields.findout(ctx, "distribate")
  authState.fields.findoutType(ctx, "referrer")
  authState.fields.acceptRules(ctx, true)
  await registerNavigationModel.next(ctx)
  await new Promise(r => setTimeout(r, 1000))
  await registerNavigationModel.next(ctx)
  await new Promise(r => setTimeout(r, 1000))
  registerSeedPhraseModel.state.repeatWords(ctx, (state) => ctx.get(teststr) ? ctx.get(teststr)!.split(" ") : state)
  await registerNavigationModel.next(ctx)
  await new Promise(r => setTimeout(r, 1000))
})

export const AuthTestWidget = reatomComponent(({ ctx }) => {
  const [nickname, setNickname] = useState("registered_1");

  return (
    <>
      <div className="fixed top-1/2 right-2 overflow-hidden max-w-46 text-sm bg-neutral-50 text-neutral-950">
        <button
          type="button"
          onClick={() => register(ctx, nickname)}
        >
          Register {nickname} user
        </button>
        <input
          value={nickname}
          className="bg-neutral-200"
          onChange={e => setNickname(e.target.value)}
          placeholder="nickname"
        />
      </div>
    </>
  )
})