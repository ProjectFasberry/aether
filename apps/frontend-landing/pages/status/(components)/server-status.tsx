import { For, mergeProps, onMount, Show } from "solid-js";
import { PlayerStatusProps, serverStatus } from "../(models)/server-status.model";
import { useAtom, useCtx } from "@reatom/npm-solid-js";
import { pageState } from "@/shared/models/global.model";
import { Skeleton } from "@/shared/ui/skeleton";
import { Dialog } from '@ark-ui/solid/dialog';
import { Typography } from "@/shared/ui/typography";
import { Link } from "@/shared/components/config/link";
import { APP_URL } from "@/shared/env";
import { Portal } from "solid-js/web";
import { dialogBackdropVariant, dialogTitleVariant } from "@/shared/ui/dialog";

type PlayerStatusImageProps = { type?: "small" | "full" } & PlayerStatusProps

const PlayerStatusImage = (props: PlayerStatusImageProps) => {
  const { avatarUrl, isLoading } = { avatarUrl: null, isLoading: false }
  const merged = mergeProps({ type: "small" }, props);

  return (
    <Show
      when={!isLoading}
      fallback={
        <Skeleton class={`rounded-md ${merged.type === 'small'
          ? 'max-w-[36px] max-h-[36px]'
          : 'max-w-[164px] max-h-[164px]'}`
        }
        />
      }
    >
      <Show when={avatarUrl} fallback={null}>
        {(url) => (
          <img
            height={800}
            width={800}
            class={`rounded-md ${merged.type === 'small'
              ? 'max-w-[36px] max-h-[36px]'
              : 'max-w-[164px] max-h-[164px]'}`
            }
            alt=""
            src={url()}
          />
        )}
      </Show>
    </Show>
  )
}

const PlayerStatus = (props: PlayerStatusProps) => {
  const nicknameByCookie = null;

  return (
    <Dialog.Root>
      <Dialog.Trigger class="w-full">
        <div
          title="Перейти к игроку"
          class="flex items-center w-full px-4 py-3 rounded-xl duration-300 hover:bg-neutral-700 bg-neutral-800 justify-start gap-4"
        >
          <PlayerStatusImage type="small" nickname={props.nickname} />
          <Typography color="white" class="text-xl">
            {props.nickname}
          </Typography>
          {nicknameByCookie && (
            <Typography color="gray" class="text-lg">
              Это вы
            </Typography>
          )}
        </div>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop class={dialogBackdropVariant()} />
        <Dialog.Positioner>
          <Dialog.Content class="justify-center !max-w-xl">
            <Dialog.Title class={dialogTitleVariant()}>{props.nickname}</Dialog.Title>
            <div class="flex flex-col items-center gap-8 w-full">
              <PlayerStatusImage type="full" nickname={props.nickname} />
              <div class="flex flex-col gap-2 w-full">
                <Link
                  href={`${APP_URL}/player/${props.nickname}`}
                  class="inline-flex items-center justify-center whitespace-nowrap
							px-4 py-2 hover:bg-[#05b458] duration-300 ease-in-out bg-[#088d47] rounded-md w-full"
                >
                  <p class="text-white text-lg">
                    Перейти к профилю
                  </p>
                </Link>
                <Dialog.CloseTrigger class="w-full">
                  <div
                    class="inline-flex items-center justify-center whitespace-nowrap
								px-4 py-2 hover:bg-[#E66A6D] bg-[#C65558] rounded-md w-full"
                  >
                    <p class="text-white text-lg">
                      Закрыть
                    </p>
                  </div>
                </Dialog.CloseTrigger>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

const ServerStatusSkeleton = () => {
  return (
    <div class="flex flex-col gap-6 w-full">
      <Skeleton class="w-full h-10" />
      <div class="flex flex-col gap-2 w-full">
        <Skeleton class="w-full h-12" />
        <Skeleton class="w-full h-12" />
        <Skeleton class="w-full h-12" />
        <Skeleton class="w-full h-12" />
        <Skeleton class="w-full h-12" />
      </div>
    </div>
  )
}

export const ServerStatus = () => {
  const ctx = useCtx();
  const [isClientAtom] = useAtom(pageState.isClient)

  onMount(() => {
    serverStatus.fetch(ctx)
  })

  const [dataAtom] = useAtom(serverStatus.fetch.dataAtom)
  const [statuses] = useAtom(serverStatus.fetch.statusesAtom);

  return (
    <Show
      when={!statuses().isPending && !isClientAtom()}
      fallback={<ServerStatusSkeleton />}
    >
      <Show
        when={dataAtom()}
        fallback={null}
      >
        {(data) => {
          const isServerOnline = data().proxy.status === 'online'

          const playersList = data().proxy.players
          const playersOnline = data().proxy.online
          const playersMax = data().proxy.max

          return (
            <>
              {!isServerOnline && (
                <p class="text-xl lg:text-2xl">
                  Список игроков недоступен
                </p>
              )}
              {(isServerOnline && playersList) && (
                <>
                  <p class="text-xl lg:text-2xl">
                    Все игроки: {playersOnline}/{playersMax}
                  </p>
                  <div class="flex flex-col gap-2 h-full">
                    {playersList.length === 0 && (
                      <p class="px-2">
                        тишина...
                      </p>
                    )}
                    <For each={playersList}>
                      {(nickname) => <PlayerStatus nickname={nickname} />}
                    </For>
                  </div>
                </>
              )}
            </>
          )
        }}
      </Show>
    </Show>
  )
}
