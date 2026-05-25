import { getStaticObject } from "@/shared/lib/volume";
import { localeAtom } from "@/shared/models/global.model";
import { action, atom, AtomState } from "@reatom/core";
import { sleep, withAssign, withConcurrency, withReset } from "@reatom/framework";
import { reatomComponent } from "@reatom/npm-react";
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/dialog";
import { Typography } from "@repo/ui/typography";
import { navigate } from "vike/client/router";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@repo/ui/select"
import { localeDefault } from "@/shared/locales";

const spyglassImage = getStaticObject("minecraft", "icons/fishing_bobber.webp")

const layoutSettingsIsTriggeredAtom = atom(false).pipe(withReset())

const layoutSettingsIsOpenAtom = atom(false, "layoutSettingsIsOpen").pipe(
  withAssign((atom, name) => ({
    open: action(async (ctx) => {
      layoutSettingsIsTriggeredAtom(ctx, true);

      await ctx.schedule(() => sleep(200));
      atom(ctx, true);
      layoutSettingsIsTriggeredAtom.reset(ctx);
    }).pipe(withConcurrency()),
    middleware: action((ctx, cb: () => void) => {
      atom(ctx, false)
      cb()
    })
  }))
)

const LayoutSettingsTrigger = reatomComponent(({ ctx }) => {
  const isTriggered = ctx.spy(layoutSettingsIsTriggeredAtom);
  const isOpen = ctx.spy(layoutSettingsIsOpenAtom);

  return (
    <button
      aria-label="Открыть настройки сайта"
      name="open-settings"
      onClick={() => layoutSettingsIsOpenAtom.open(ctx)}
      className={`top-2/3 group -translate-y-1/4 focus:scale-[1.1] cursor-pointer absolute right-4 w-12 h-12 z-[100] duration-500 ease-in-out
        ${isTriggered ? "-translate-y-[9999px]" : "translate-y-0"} 
        ${isOpen ? "hidden" : "block"}
      `}
    >
      <img src={spyglassImage} alt="" draggable={false} width={46} height={46} />
    </button>
  )
}, "LayoutSettingsTrigger")

const WEATHERS = [
  { title: "Ясная", value: "clean" },
  { title: "Дождливая", value: "rain" },
  { title: "Снежная", value: "snow" }
]

const LANGUAGES = [
  { title: "Русский", value: "ru" },
  { title: "Английский", value: "en" },
]

export const weatherAtom = atom<"clean" | "rain" | "snow">("clean");

const selectedWeatherAtom = atom((ctx) => WEATHERS.find(d => d.value === ctx.spy(weatherAtom)) ?? WEATHERS[0])
const selectedLangAtom = atom((ctx) => LANGUAGES.find(d => d.value === ctx.spy(localeAtom)) ?? LANGUAGES[0])

localeAtom.onChange((ctx, state) => {
  let link = `/${state}`

  if (state === localeDefault) {
    link = `/`
  }

  ctx.schedule(() => navigate(link))
})

const Language = reatomComponent(({ ctx }) => {
  return (
    <div className="flex items-center justify-between w-full gap-1">
      <Typography>
        Язык
      </Typography>
      <Select onValueChange={v => layoutSettingsIsOpenAtom.middleware(ctx, () => localeAtom(ctx, v as AtomState<typeof localeAtom>))}>
        <SelectTrigger>
          {ctx.spy(selectedLangAtom).title}
        </SelectTrigger>
        <SelectContent>
          <div className="flex flex-col gap-1 w-full h-full">
            {LANGUAGES.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                className="flex items-center justify-between gap-1 w-full"
              >
                <Typography>
                  {item.title}
                </Typography>
              </SelectItem>
            ))}
          </div>
        </SelectContent>
      </Select>
    </div>
  )
}, "Language")

const Weather = reatomComponent(({ ctx }) => {
  return (
    <div className="flex items-center justify-between w-full gap-1">
      <Typography>
        Погода
      </Typography>
      <Select onValueChange={v => layoutSettingsIsOpenAtom.middleware(ctx, () => weatherAtom(ctx, v as AtomState<typeof weatherAtom>))}>
        <SelectTrigger>
          {ctx.spy(selectedWeatherAtom).title}
        </SelectTrigger>
        <SelectContent>
          <div className="flex flex-col gap-1 w-full h-full">
            {WEATHERS.map((item) => (
              <SelectItem key={item.value} value={item.value} className="flex items-center justify-between gap-1 w-full">
                <Typography>
                  {item.title}
                </Typography>
              </SelectItem>
            ))}
          </div>
        </SelectContent>
      </Select>
    </div>
  )
}, "Weather")

const LayoutSettingsContent = reatomComponent(({ ctx }) => {
  return (
    <Dialog open={ctx.spy(layoutSettingsIsOpenAtom)} onOpenChange={v => layoutSettingsIsOpenAtom(ctx, v)}>
      <DialogContent>
        <DialogTitle className='text-center text-xl'>Настройки</DialogTitle>
        <div className="flex flex-col gap-2 w-full">
          <Weather />
          <Language />
        </div>
      </DialogContent>
    </Dialog>
  )
}, "LayoutSettingsContent")

export const LayoutSettings = () => {
  return (
    <>
      <LayoutSettingsTrigger />
      <LayoutSettingsContent />
    </>
  )
}