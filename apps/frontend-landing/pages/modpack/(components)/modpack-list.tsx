import { Typography } from '@/shared/ui/typography';
import { Skeleton } from '@/shared/ui/skeleton';
import { getDayjs } from '@/shared/lib/create-dayjs';
import { Dialog } from '@ark-ui/solid/dialog';
import { Button } from '@/shared/ui/button';
import { useAtom, useCtx } from '@reatom/npm-solid-js';
import { For, Index, onMount, Show } from 'solid-js';
import { Modpack, modpacksModel } from '../(models)/modpack.model';
import { Portal } from 'solid-js/web';
import { dialogBackdropVariant, DialogClose, dialogContentVariant, dialogPositionerVariant } from '@/shared/ui/dialog';

const { modpacks, modpacksState } = modpacksModel()

const SelectedModpack = () => {
  const [modpackAtom] = useAtom(modpacksState.item)

  const modpack = modpackAtom();
  if (!modpack) return null;

  const { mods, shaders } = modpack

  const dayjs = getDayjs()
  const created_at = dayjs(modpack.created_at).format('YYYY-MM-DD HH:mm:ss')

  return (
    <div class="flex flex-col gap-y-4">
      <div class="flex flex-col gap-2">
        <Typography class="text-xl">Моды</Typography>
        <Show
          when={mods}
          fallback={<Typography color="gray" class="text-lg">пусто</Typography>}
        >
          {(items) =>
            <div class="flex items-center gap-2 flex-wrap">
              <For each={items()}>
                {(item) =>
                  <div class="flex bg-neutral-600/80 px-4 py-1 rounded-sm">
                    <Typography class="text-lg text-white">{item}</Typography>
                  </div>
                }
              </For>
            </div>
          }
        </Show>
      </div>
      <div class="flex flex-col gap-2">
        <Typography class='text-xl'>
          Шейдеры
        </Typography>
        <Show
          when={shaders}
          fallback={<Typography color="gray" class="text-lg">пусто</Typography>}
        >
          {(items) =>
            <For each={items()}>
              {(item) => <div class="flex bg-neutral-600/80 px-4 py-1 rounded-sm">
                <Typography color="white" class="text-lg">
                  {item}
                </Typography>
              </div>
              }
            </For>
          }
        </Show>
      </div>
      <div class="self-end">
        <Typography color="gray" class='text-md'>
          Создан {created_at}
        </Typography>
      </div>
    </div>
  )
}

const ModpackItemDialog = () => {
  const [isOpenAtom, setIsOpenAtom] = useAtom(modpacksState.isOpen);

  return (
    <Dialog.Root
      open={isOpenAtom()}
      onOpenChange={details => setIsOpenAtom(details.open)}
    >
      <Portal>
        <Dialog.Backdrop class={dialogBackdropVariant()} />
        <Dialog.Positioner class={dialogPositionerVariant()}>
          <Dialog.Content class={dialogContentVariant()}>
            <SelectedModpack />
            <DialogClose />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

const ModpackItem = (props: Modpack) => {
  const ctx = useCtx();

  const m = () => {
    const { id, name, version, shaders, mods, client, imageUrl, downloadLink } = props;
    return { id, name, version, shaders, mods, client, imageUrl, downloadLink };
  };

  return (
    <div class="flex flex-col rounded-xl gap-4 justify-between h-full bg-neutral-950 p-4 relative">
      <div class="flex flex-col gap-2 justify-between grow">
        <Typography class="text-xl lg:text-2xl text-project-color">
          {m().name}
        </Typography>
        <div class="flex items-center gap-2">
          <Typography color="white" class='text-lg'>
            Клиент: {m().client}
          </Typography>
          <Typography color="gray" class="text-lg">
            ({m().version})
          </Typography>
        </div>
        <div class="flex flex-col md:flex-row items-center justify-center w-full gap-2">
          <a href={m().downloadLink} target="_blank" rel="noreferrer" class='w-full md:w-1/2'>
            <Button variant="minecraft" class="py-0.5 w-full">
              <Typography color="white" class="text-xl">
                Скачать
              </Typography>
            </Button>
          </a>
          <Button
            variant="minecraft"
            onClick={() => modpacks.open(ctx, m().id)}
            class="w-full py-0.5 md:w-1/2"
          >
            <Typography color="white" class="text-xl">
              Подробнее
            </Typography>
          </Button>
        </div>
      </div>
      <div
        class="h-[200px] group bg-cover relative overflow-hidden rounded-xl cursor-pointer"
        style={{ "background-image": `url("${m().imageUrl}")` }}
      >
        <div
          class="flex flex-col gap-4 px-4 py-12 translate-y-64 focus:translate-y-0 group-hover:translate-y-0
            absolute bottom-0 right-0 left-0 bg-black/70 backdrop-blur-2xl"
        >
          <div class="flex flex-col gap-y-1">
            <Typography class='text-lg'>Моды</Typography>
            <Show
              when={m().mods}
              fallback={<Typography color="gray" class="text-sm">пусто</Typography>}
            >
              {(items) =>
                <div class="flex items-center gap-1 flex-wrap">
                  <For each={items().slice(0, 3)}>
                    {(item) =>
                      <div class="flex bg-neutral-600/80 px-2 py-0.5 rounded-sm">
                        <Typography color="white" class="text-md">
                          {item}
                        </Typography>
                      </div>
                    }
                  </For>
                  <Show when={items().length >= 3}>
                    <div class="flex bg-neutral-600/80 px-2 py-0.5 rounded-sm">
                      <Typography color="white" class="text-md">
                        +{m().mods.length - 3}
                      </Typography>
                    </div>
                  </Show>
                </div>
              }
            </Show>
          </div>
          <div class="flex flex-col gap-y-1">
            <Typography class='text-lg'>
              Шейдеры
            </Typography>
            <Show
              when={m().shaders.length >= 1}
              fallback={<Typography color="gray" class="text-sm">пусто</Typography>}
            >
              {(items) =>
                <div class="flex items-center gap-1 flex-wrap">
                  <For each={m().shaders.slice(0, 3)}>
                    {(item) =>
                      <div class="flex bg-neutral-600/80 px-2 py-0.5 rounded-sm">
                        <Typography color="white" class="text-md">
                          {item}
                        </Typography>
                      </div>
                    }
                  </For>
                  <Show when={m().shaders.length >= 3}>
                    <div class="flex bg-neutral-600/80 px-2 py-0.5 rounded-sm">
                      <Typography color="white" class="text-md">
                        +{m().shaders.length - 3}
                      </Typography>
                    </div>
                  </Show>
                </div>
              }
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}

const ModpackListEmpty = () => {
  return (
    <Typography class="text-neutral-400 text-2xl">Модпаков еще нет</Typography>
  )
};

const ModpackListSkeleton = () => {
  return (
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full xl:grid-cols-4 gap-4 grid-rows-2">
      <Index each={Array.from({ length: 6 })}>
        {() => <Skeleton class="w-full h-80" />}
      </Index>
    </div>
  );
};

export const ModpackList = () => {
  const ctx = useCtx();

  onMount(() => {
    modpacks.fetch(ctx)
  })

  const [dataAtom] = useAtom(modpacks.fetch.dataAtom);
  const [statusesAtom] = useAtom(modpacks.fetch.statusesAtom)

  return (
    <Show when={!statusesAtom().isPending} fallback={<ModpackListSkeleton />}>
      <Show
        when={!statusesAtom().isRejected || dataAtom()}
        fallback={<ModpackListEmpty />}
      >
        <Show when={dataAtom()} fallback={<ModpackListEmpty />}>
          {(data) => (
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full xl:grid-cols-4 gap-4 grid-rows-2">
              <ModpackItemDialog />
              <For each={data()}>
                {(modpack) => <ModpackItem {...modpack} />}
              </For>
            </div>
          )}
        </Show>
      </Show>
    </Show>
  );
}
