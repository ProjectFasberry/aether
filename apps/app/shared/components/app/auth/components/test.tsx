import { reatomComponent } from "@reatom/npm-react";
import { useState } from "react";
import { registerNavigationModel, registerSeedPhraseModel } from "../models/register.model";
import { authState } from "../models/auth.model";
import { teststr } from "../models/auth-security.model";
import { action } from "@reatom/framework";
import { login } from "../models/login.model";

const log = action(async (ctx) => {
  authState.type(ctx, "login");
  authState.fields.nickname(ctx, "tester");
  authState.fields.password(ctx, "tester");
  login.basic.submit(ctx)
})

const reg = action(async (ctx, nickname: string) => {
  authState.type(ctx, "register")
  authState.fields.nickname(ctx, nickname)
  authState.fields.password(ctx, nickname)
  authState.fields.findout(ctx, "distribate")
  authState.fields.findoutType(ctx, "referrer")
  authState.fields.acceptRules(ctx, true)
  let result = await registerNavigationModel.next(ctx)
  if (!result) return;
  result = await registerNavigationModel.next(ctx)
  if (!result) return;
  registerSeedPhraseModel.state.repeatWords(ctx, (s) => ctx.get(teststr) ? ctx.get(teststr)!.split(" ") : s)
  result = await registerNavigationModel.next(ctx)
  if (!result) return;
})

export const AuthTestWidget = reatomComponent(({ ctx }) => {
  const [nickname, setNickname] = useState("registered_1");

  return (
    <>
      <div className="fixed top-1/2 right-2 overflow-hidden max-w-46 text-sm bg-neutral-50 text-neutral-950">
        <div className="flex flex-col w-full gap-1">
          <button
            type="button"
            onClick={() => reg(ctx, nickname)}
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
        <div className="flex flex-col w-full gap-1">
          <button
            type="button"
            onClick={() => log(ctx)}
          >
            Login tester
          </button>
        </div>
      </div>
    </>
  )
})