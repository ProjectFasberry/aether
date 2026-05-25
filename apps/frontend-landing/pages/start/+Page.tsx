import { Link } from "@/shared/components/config/link";
import { MainWrapperPage } from "@repo/ui/main-wrapper";
import { toast } from "sonner";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Typography } from "@repo/ui/typography";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@repo/ui/tooltip";
import { client } from "@/shared/api/client";
import { Button } from "@repo/ui/button";
import { tv } from "tailwind-variants";
import { getStaticObject } from "@/shared/lib/volume";
import { APP_URL } from "@/shared/env";

const dirtImage = getStaticObject("minecraft/static", "dirt.webp")

const NumericItem = ({ index }: { index: number }) => {
  return (
    <div className="flex items-center justify-center aspect-square border-shark-800">
      <p className="text-white text-xl lg:text-2xl">
        {index}.
      </p>
    </div>
  )
}

const serverIpResource = reatomAsync(async (ctx) => {
  return await ctx.schedule(async () => {
    const res = await client("shared/server-ip", {
      signal: ctx.controller.signal, throwHttpErrors: false
    })

    const data = await res.json<{ data: { ip: string } } | { error: string }>()

    if ("error" in data) return null;

    return data.data?.ip ?? null;
  })
}).pipe(withDataAtom(null), withCache({ swr: false }), withStatusesAtom())

export const actionCopyboard = async (ip: string) => navigator.clipboard.writeText(ip)

const ServerIp = reatomComponent(({ ctx }) => {
  useUpdate(serverIpResource, []);

  const data = ctx.spy(serverIpResource.dataAtom)
  const isLoading = ctx.spy(serverIpResource.statusesAtom).isPending

  const handle = async () => {
    if (!data) return;

    await actionCopyboard(data)
    toast.success("IP успешно скопирован!")
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={1}>
        <TooltipTrigger>
          <div className="flex items-center justify-start bg-black w-full py-2 px-2 border-2 border-neutral-500">
            <Typography onClick={handle} color="white" className="text-base text-left">
              {isLoading ? "загрузка..." : data ? data : "недоступно"}
            </Typography>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-neutral-900">
          <Typography color="gray" className="text-lg">Скопировать IP</Typography>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}, "ServerIp")

const HowToConnectOnServer = () => {
  return (
    <div className="flex justify-center items-center px-4 py-8 relative h-full w-full">
      <div className="flex flex-col gap-6 justify-between md:w-96 w-full">
        <div className="flex flex-col gap-2 w-full">
          <Typography color="gray" className="text-base">Название сервера</Typography>
          <div className="bg-black py-2 px-2 border-2 border-neutral-500 w-full">
            <Typography color="white" className="text-left text-base">Сервер Minecraft</Typography>
          </div>
          <Typography color="gray" className="text-base">Адрес сервера</Typography>
          <ServerIp />
        </div>
        <div className="flex flex-col gap-y-2">
          <TooltipProvider>
            <Tooltip delayDuration={1}>
              <TooltipTrigger>
                <div className="flex items-center justify-start bg-black w-full py-2 px-2 border-2 border-neutral-500">
                  <Typography color="white" className="text-center text-base">
                    Наборы ресурсов: Включены
                  </Typography>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-neutral-900">
                <Typography color="gray" className="text-lg">
                  На сервере используется ресурспак. Эту нужно оставить включенным!
                </Typography>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="minecraft" className="flex items-center justify-center w-full px-2 py-1">
            <Typography color="white" className="text-center text-base">
              Готово
            </Typography>
          </Button>
        </div>
      </div>
    </div>
  )
}

const stepVariant = tv({
  base: `flex flex-col sm:flex-row items-center justify-between w-full gap-4 h-fit`
})

const stepContentVariant = tv({
  base: "flex flex-col gap-6 items-center h-full w-full sm:w-2/3"
})

const stepImageVariant = tv({
  base: `flex justify-center sm:justify-end items-center w-full sm:w-1/3`
})


export default function Page() {
  return (
    <MainWrapperPage>
      <div className="flex flex-col items-center w-full gap-12 h-full">
        <h1 className="text-white text-center text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl">
          Как начать играть
        </h1>
        <div className="flex flex-col gap-16 w-full h-full">
          <div className={stepVariant()}>
            <div className={stepContentVariant()}>
              <div className="flex items-start gap-4 w-full">
                <NumericItem index={1} />
                <Typography color="white" className="text-md md:text-xl lg:text-2xl">
                  <a
                    href={`${APP_URL}/auth`}
                    className="text-green text-shadow-lg hover:underline-offset-8 hover:underline"
                  >
                    Зарегистрироваться
                  </a>&nbsp;на проекте.
                  После регистрации убедитесь, что вы успешно вошли на форум и личный кабинет.
                </Typography>
              </div>
            </div>
            <div className={stepImageVariant()}>
              <img
                src={getStaticObject("minecraft", "items/seeking_wolf.png")}
                draggable={false}
                width={128}
                height={128}
                alt="Register"
                loading="lazy"
              />
            </div>
          </div>
          <div className={stepVariant()}>
            <div className={stepContentVariant()}>
              <div className="flex items-start gap-4 w-full">
                <NumericItem index={2} />
                <div className="flex flex-col">
                  <Typography color="white" className="text-md md:text-xl lg:text-2xl">
                    Зайди в клиент майнкрафта под ником, который вы указали при регистрации
                  </Typography>
                  <span className="text-white text-md md:text-xl lg:text-2xl mt-4">P.S:</span>
                  <Typography color="white" className="text-md md:text-xl lg:text-2xl">
                    Если пиратка, рекомендую: <Link href="https://llaun.ch/ru" className="text-neutral-400">*тык</Link>
                  </Typography>
                  <Typography color="white" className="text-md md:text-xl lg:text-2xl">
                    Если лицензия, рекомендую: <Link href="https://modrinth.com/app" className="text-neutral-400">*тык</Link>
                  </Typography>
                </div>
              </div>
            </div>
            <div className={stepImageVariant()}>
              <img
                src={getStaticObject("minecraft", "items/enderman_boosts.png")}
                draggable={false}
                width={128}
                height={128}
                alt="Cabinet"
                loading="lazy"
              />
            </div>
          </div>
          <div className={stepVariant()}>
            <div className="flex items-start gap-4 w-full sm:w-2/3">
              <NumericItem index={3} />
              <Typography color="white" className="text-md md:text-xl lg:text-2xl">
                Удачной игры! <span className="text-red">❤</span>
              </Typography>
            </div>
            <div className={stepImageVariant()}>
              <img
                src={getStaticObject("minecraft", "items/adventure_icon.png")}
                draggable={false}
                width={128}
                height={128}
                alt="Done"
                loading="lazy"
              />
            </div>
          </div>
          <div className="flex border-4 border-black rounded-lg overflow-hidden h-[80vh] relative w-full">
            <div
              className="absolute w-full h-[80vh] left-0 right-0 top-0 bottom-0"
              style={{ backgroundImage: `url(${dirtImage})` }}
            />
            <HowToConnectOnServer />
          </div>
        </div>
      </div>
    </MainWrapperPage>
  )
}
