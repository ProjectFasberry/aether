import { Link } from "@/shared/components/config/link";
import { MainWrapperPage } from "@/shared/ui/main-wrapper";
import { Typography } from "@/shared/ui/typography";
import { Tooltip } from "@ark-ui/solid/tooltip";
import { Button } from "@/shared/ui/button";
import { tv } from "tailwind-variants";
import { getStaticObject } from "@/shared/lib/helpers";
import { APP_URL } from "@/shared/env";
import { onMount, Show } from "solid-js";
import { useAtom, useCtx } from "@reatom/npm-solid-js";
import { serverIp } from "./(models)/server-ip.model";
import { Portal } from "solid-js/web";

const dirtImage = getStaticObject("minecraft/static", "dirt.webp")

const NumericItem = ({ index }: { index: number }) => {
  return (
    <div class="flex items-center justify-center aspect-square border-shark-800">
      <p class="text-white text-xl lg:text-2xl">
        {index}.
      </p>
    </div>
  )
}

const ServerIp = () => {
  const ctx = useCtx();

  onMount(() => {
    serverIp.fetch(ctx)
  })

  const [dataAtom] = useAtom(serverIp.fetch.dataAtom)
  const [statusesAtom] = useAtom(serverIp.fetch.statusesAtom)

  return (
    <Tooltip.Root openDelay={1} closeDelay={1}>
      <Tooltip.Trigger>
        <div class="flex items-center justify-start bg-black w-full py-2 px-2 border-2 border-neutral-500">
          <Typography onClick={() => serverIp.copyIp(ctx)} color="white" class="text-base text-left">
            <Show
              when={!statusesAtom().isPending}
              fallback={"загрузка..."}
            >
              <Show when={dataAtom()} fallback="недоступно">
                {(data) => data()}
              </Show>
            </Show>
          </Typography>
        </div>
      </Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content class="bg-neutral-900">
            <Typography color="gray" class="text-lg">Скопировать IP</Typography>
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  )
}

const HowToConnectOnServer = () => {
  return (
    <div class="flex justify-center items-center px-4 py-8 relative h-full w-full">
      <div class="flex flex-col gap-6 justify-between md:w-96 w-full">
        <div class="flex flex-col gap-2 w-full">
          <Typography color="gray" class="text-base">Название сервера</Typography>
          <div class="bg-black py-2 px-2 border-2 border-neutral-500 w-full">
            <Typography color="white" class="text-left text-base">Сервер Minecraft</Typography>
          </div>
          <Typography color="gray" class="text-base">Адрес сервера</Typography>
          <ServerIp />
        </div>
        <div class="flex flex-col gap-y-2">
          <Tooltip.Root closeDelay={1} openDelay={1}>
            <Tooltip.Trigger>
              <div class="flex items-center justify-start bg-black w-full py-2 px-2 border-2 border-neutral-500">
                <Typography color="white" class="text-center text-base">
                  Наборы ресурсов: Включены
                </Typography>
              </div>
            </Tooltip.Trigger>
            <Portal>
              <Tooltip.Positioner>
                <Tooltip.Content class="bg-neutral-900">
                  <Typography color="gray" class="text-lg">
                    На сервере используется ресурспак. Эту нужно оставить включенным!
                  </Typography>
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Portal>
          </Tooltip.Root>
          <Button variant="minecraft" class="flex items-center justify-center w-full px-2 py-1">
            <Typography color="white" class="text-center text-base">
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
      <div class="flex flex-col items-center w-full gap-12 h-full">
        <h1 class="text-white text-center text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl">
          Как начать играть
        </h1>
        <div class="flex flex-col gap-16 w-full h-full">
          <div class={stepVariant()}>
            <div class={stepContentVariant()}>
              <div class="flex items-start gap-4 w-full">
                <NumericItem index={1} />
                <Typography color="white" class="text-md md:text-xl lg:text-2xl">
                  <a
                    href={`${APP_URL}/auth`}
                    class="text-green text-shadow-lg hover:underline-offset-8 hover:underline"
                  >
                    Зарегистрироваться
                  </a>&nbsp;на проекте.
                  После регистрации убедитесь, что вы успешно вошли на форум и личный кабинет.
                </Typography>
              </div>
            </div>
            <div class={stepImageVariant()}>
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
          <div class={stepVariant()}>
            <div class={stepContentVariant()}>
              <div class="flex items-start gap-4 w-full">
                <NumericItem index={2} />
                <div class="flex flex-col">
                  <Typography color="white" class="text-md md:text-xl lg:text-2xl">
                    Зайди в клиент майнкрафта под ником, который вы указали при регистрации
                  </Typography>
                  <span class="text-white text-md md:text-xl lg:text-2xl mt-4">P.S:</span>
                  <Typography color="white" class="text-md md:text-xl lg:text-2xl">
                    Если пиратка, рекомендую: <Link href="https://llaun.ch/ru" class="text-neutral-400">*тык</Link>
                  </Typography>
                  <Typography color="white" class="text-md md:text-xl lg:text-2xl">
                    Если лицензия, рекомендую: <Link href="https://modrinth.com/app" class="text-neutral-400">*тык</Link>
                  </Typography>
                </div>
              </div>
            </div>
            <div class={stepImageVariant()}>
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
          <div class={stepVariant()}>
            <div class="flex items-start gap-4 w-full sm:w-2/3">
              <NumericItem index={3} />
              <Typography color="white" class="text-md md:text-xl lg:text-2xl">
                Удачной игры! <span class="text-red">❤</span>
              </Typography>
            </div>
            <div class={stepImageVariant()}>
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
          <div class="flex border-4 border-black rounded-lg overflow-hidden h-[80vh] relative w-full">
            <div
              class="absolute w-full h-[80vh] left-0 right-0 top-0 bottom-0"
              style={{ "background-image": `url(${dirtImage})` }}
            />
            <HowToConnectOnServer />
          </div>
        </div>
      </div>
    </MainWrapperPage>
  )
}
