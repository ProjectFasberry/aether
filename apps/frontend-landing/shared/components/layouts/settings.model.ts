import { localeDefault } from "@/shared/locales";
import { localeAtom } from "@/shared/models/global.model";
import { action, atom, sleep, withAssign, withConcurrency, withReset } from "@reatom/framework";
import { navigate } from "vike/client/router";

export const WEATHERS = [
  { title: "Ясная", value: "clean" },
  { title: "Дождливая", value: "rain" },
  { title: "Снежная", value: "snow" }
]

export const LANGUAGES = [
  { title: "Русский", value: "ru" },
  { title: "Английский", value: "en" },
]

export const weatherAtom = atom<"clean" | "rain" | "snow">("clean");

export const selectedWeatherAtom = atom((ctx) => WEATHERS.find(d => d.value === ctx.spy(weatherAtom)) ?? WEATHERS[0])
export  const selectedLangAtom = atom((ctx) => LANGUAGES.find(d => d.value === ctx.spy(localeAtom)) ?? LANGUAGES[0])

localeAtom.onChange((ctx, state) => {
  let link = `/${state}`

  if (state === localeDefault) {
    link = `/`
  }

  ctx.schedule(() => navigate(link))
})

export const layoutSettingsIsTriggeredAtom = atom(false).pipe(withReset())

export const layoutSettingsIsOpenAtom = atom(false, "layoutSettingsIsOpen").pipe(
  withAssign((atom, name) => ({
    open: action(async (ctx) => {
      layoutSettingsIsTriggeredAtom(ctx, true);

      await ctx.schedule(() => sleep(150));
      atom(ctx, true);
      layoutSettingsIsTriggeredAtom.reset(ctx);
    }).pipe(
      withConcurrency()
    ),
    middleware: action((ctx, cb: () => void) => {
      atom(ctx, false)
      cb()
    })
  }))
)
