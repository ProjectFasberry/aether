import { MainWrapperPage } from "@/shared/ui/main-wrapper";
import { Skeleton } from "@/shared/ui/skeleton";
import { Typography, typographyVariants } from "@/shared/ui/typography";
import { tv } from "tailwind-variants";
import { Show } from "solid-js";
import { useAtom } from "@reatom/npm-solid-js";
import { serverStatus } from "./(models)/server-status.model";
import { ServerStatus } from "./(components)/server-status";
import { getStaticObject } from "@/shared/lib/helpers";

const serverTitle = tv({
  extend: typographyVariants,
  base: `text-md sm:text-base md:text-lg lg:text-xl`
})

const descTitle = tv({
  extend: typographyVariants,
  base: `text-md sm:text-base text-neutral-400 truncate md:text-lg lg:text-xl`
})

const StatusItem = () => {
  const [statusAtom] = useAtom(serverStatus.fetch.dataAtom)
  const [statusesAtom] = useAtom(serverStatus.fetch.statusesAtom)

  return (
    <div class="card-wrapper flex flex-col h-fit gap-4">
      <Typography class="text-xl lg:text-2xl">
        Статус
      </Typography>
      <div class="flex flex-col items-start gap-4">
        <div class="flex flex-col gap-2 w-full">
          <div class="grid grid-cols-[1fr_1fr] grid-rows-1 w-full bg-neutral-800 p-2 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="hidden sm:flex items-center justify-center bg-neutral-700/40 rounded-lg p-2">
                <img
                  src={getStaticObject("minecraft", "items/netherite_sword.webp")}
                  alt=""
                  width={24}
                  draggable={false}
                  height={24}
                />
              </div>
              <Typography class={serverTitle()}>Bisquite</Typography>
            </div>
            <div class="flex items-center w-full justify-end gap-3">
              <Typography color="gray" class={descTitle()}>
                <span class="hidden sm:inline">играет</span>
                <Show when={statusAtom()} fallback={0}>
                  {(data) => data()?.servers.bisquite.online}
                </Show>
                &nbsp;игроков
              </Typography>
            </div>
          </div>
          <div class="grid grid-cols-[1fr_1fr] gap-2 grid-rows-1 w-full bg-neutral-800 p-2 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="hidden sm:flex items-center justify-center bg-neutral-700/40 rounded-lg p-2">
                <img
                  src={getStaticObject("minecraft", "items/wild_armor_trim_ыmithing_еemplate.webp")}
                  alt=""
                  width={24}
                  draggable={false}
                  height={24}
                />
              </div>
              <Typography class={serverTitle()}>Muffin</Typography>
            </div>
            <div class="flex items-center w-full justify-end gap-3">
              <Typography color="gray" class={descTitle()}>
                <span class="hidden sm:inline">играет</span>
                <Show when={statusAtom()} fallback={0}>
                  {(data) => data()?.servers.muffin.online}
                </Show>
                &nbsp;игроков
              </Typography>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-between w-full">
          <Show
            when={!statusesAtom().isPending}
            fallback={
              <div class="flex items-center gap-2">
                <Typography class={descTitle({ className: "text-right" })}>
                  Всего:
                </Typography>
                <Skeleton class="h-8 w-8" />
              </div>
            }
          >
            <Show when={statusAtom()}>
              {(data) => (
                <Typography class={descTitle({ className: "text-right" })}>
                  Всего: {data().proxy.online ?? 0}
                </Typography>
              )}
            </Show>
          </Show>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <MainWrapperPage variant="with_section">
      <div class="full-screen-section min-h-screen flex items-center justify-center py-32">
        <div class="flex h-full flex-col lg:flex-row justify-start overflow-hidden items-start gap-6 responsive">
          <iframe
            src="https://discord.com/widget?id=958086036393689098&theme=dark"
            width="350"
            height="500"
            // @ts-ignore
            allowtransparency={true.toString()}
            className="rounded-[4px]! border-2 border-[#454545] w-full lg:w-1/4"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          />
          <div class="flex flex-col w-full gap-6 lg:w-3/4 h-full">
            <StatusItem />
            <div
              class="flex flex-col max-h-[496px] overflow-y-scroll gap-6 card-wrapper w-full h-full"
            >
              <ServerStatus />
            </div>
          </div>
        </div>
      </div>
    </MainWrapperPage>
  )
}
