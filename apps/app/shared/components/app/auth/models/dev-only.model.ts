import { withLocalStorage } from "@reatom/persist-web-storage";
import { registerNavigationModel, registerSeedPhraseModel } from "../models/register.model";
import { authState } from "../models/auth.model";
import { action, atom } from "@reatom/framework";
import { login } from "../models/login.model";
import { devtools } from "@/shared/models/devtools/index.model";
import { withLog } from "@/shared/lib/reatom/helpers";

export const teststr = atom<Nullable<string>>(null).pipe(withLocalStorage({ key: "test-str-auth-sp" }))
const nicknameAtom = atom("registered_1");

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

export const startAuthWidget = action(async (ctx) => {
  const result = await devtools.wrap(ctx, (pane) => {
    let value = "";

    const regBtn = pane
      .addButton({ title: `register as ${value}`, })
      .on("click", () => reg(ctx, ctx.get(nicknameAtom)))

    const regInp = pane.addBlade({
      view: 'text',
      label: 'nickname',
      parse: (state: unknown) => nicknameAtom(ctx, String(state)),
      value
    });

    const logBtn = pane
      .addButton({ title: `login as tester`, })
      .on("click", () => log(ctx));

    const un = ctx.subscribe(nicknameAtom, (state) => {
      value = state
      regBtn.title = `register as ${value}`
    })

    const blades = [regBtn, logBtn, regInp]
    const unsubs = [un]
    
    const unsub = () => {
      blades.forEach(t => { t.dispose() })
      unsubs.forEach(t => { t() })
    }

    return unsub
  })
  
  return () => result?.()
}, "startAuthWidget").pipe(withLog())