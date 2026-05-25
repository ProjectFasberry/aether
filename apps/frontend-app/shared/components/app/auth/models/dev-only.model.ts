import { withLocalStorage } from "@reatom/persist-web-storage";
import { registerNavigationModel, registerSeedPhraseModel } from "../models/register.model";
import { authState } from "../models/auth.model";
import { action, atom, withAssign } from "@reatom/framework";
import { login } from "../models/login.model";
import { devtools } from "@/shared/models/devtools/index.model";

export const teststr = atom<Nullable<string>>(null).pipe(withLocalStorage({ key: "test-str-auth-sp" }))
const nicknameAtom = atom("registered_1");

const events = atom(null).pipe(
  withAssign(() => ({
    login: action(async (ctx) => {
      authState.type(ctx, "login");
      authState.fields.nickname(ctx, "tester");
      authState.fields.password(ctx, "tester");
      login.basic.submit(ctx)
    }),
    register: action(async (ctx, nickname: string) => {
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
  }))
)

export const startAuthWidget = action(async (ctx) => {
  const result = await devtools.wrap(ctx, (pane) => {
    let value = "";

    const authFolder = pane.addFolder({
      title: "auth",
      expanded: true
    })

    const regBtn = authFolder
      .addButton({ title: `Register as ${value}`, })
      .on("click", () => events.register(ctx, ctx.get(nicknameAtom)))

    const logBtn = authFolder
      .addButton({ title: `Login as tester`, })
      .on("click", () => events.login(ctx));

    const regInp = authFolder.addBlade({
      view: 'text',
      label: 'Register nickname',
      parse: (state: unknown) => nicknameAtom(ctx, String(state)),
      value
    });

    const un = ctx.subscribe(nicknameAtom, (state) => {
      value = state
      regBtn.title = `Register as ${value}`
    })

    const blades = [regBtn, logBtn, regInp]
    const unsubs = [un]

    const unsub = () => {
      blades.forEach(t => { t.dispose() })
      unsubs.forEach(t => { t() })
      authFolder.dispose()
    }

    return unsub
  })

  return () => result?.()
}, "startAuthWidget")
