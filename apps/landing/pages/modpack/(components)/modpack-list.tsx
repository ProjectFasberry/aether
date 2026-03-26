import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from '@reatom/async';
import { Typography } from '@repo/ui/typography';
import { Skeleton } from '@repo/ui/skeleton';
import { reatomComponent, useUpdate } from '@reatom/npm-react';
import { client } from '@/shared/api/client';
import { toast } from 'sonner';
import { dayjs } from '@/shared/lib/create-dayjs';
import { Dialog, DialogContent } from '@repo/ui/dialog';
import { action, atom } from '@reatom/core';
import { withReset } from '@reatom/framework';
import { Button } from '@repo/ui/button';

const selectedModpackItemAtom = atom<Modpack | null>(null, "selectedModpackItem").pipe(withReset())
const selectedModpackDialogIsOpenAtom = atom(false, "selectedModpackDialogIsOpen")

const openModpackMoreAction = action((ctx, id: string) => {
  const modpacks = ctx.get(modpacksAction.dataAtom);
  if (!modpacks) throw new Error("Modpacks is not defined")

  const modpack = modpacks.find(target => target.id === id)
  if (!modpack) throw new Error("Modpack is not defined");

  selectedModpackItemAtom(ctx, modpack);
  selectedModpackDialogIsOpenAtom(ctx, true);
})

selectedModpackDialogIsOpenAtom.onChange((ctx, state) => {
  if (!state) {
    selectedModpackItemAtom.reset(ctx)
  }
})

const SelectedModpack = reatomComponent(({ ctx }) => {
  const modpack = ctx.spy(selectedModpackItemAtom)
  if (!modpack) return null;

  const { mods, shaders } = modpack

  const created_at = dayjs(modpack.created_at).format('YYYY-MM-DD HH:mm:ss')

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-col gap-2">
        <Typography className="text-xl">Моды</Typography>
        {mods ? (
          <div className="flex items-center gap-2 flex-wrap">
            {mods.map((mod, idx) =>
              <div key={idx} className="flex bg-neutral-600/80 px-4 py-1 rounded-sm">
                <Typography className="text-lg text-white">{mod}</Typography>
              </div>
            )}
          </div>
        ) : (
          <Typography color="gray" className="text-lg">пусто</Typography>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Typography className='text-xl'>
          Шейдеры
        </Typography>
        {shaders ? (
          <div className="flex items-center gap-2 flex-wrap">
            {shaders.map((shader, idx) =>
              <div key={idx} className="flex bg-neutral-600/80 px-4 py-1 rounded-sm">
                <Typography color="white" className="text-lg">
                  {shader}
                </Typography>
              </div>
            )}
          </div>
        ) : (
          <Typography color="gray" className="text-lg">пусто</Typography>
        )}
      </div>
      <div className="self-end">
        <Typography color="gray" className='text-md'>
          Создан {created_at}
        </Typography>
      </div>
    </div>
  )
}, "SelectedModpack")

const ModpackItemDialog = reatomComponent(({ ctx }) => {
  return (
    <Dialog
      open={ctx.spy(selectedModpackDialogIsOpenAtom)}
      onOpenChange={v => selectedModpackDialogIsOpenAtom(ctx, v)}
    >
      <DialogContent>
        <SelectedModpack />
      </DialogContent>
    </Dialog>
  )
}, "ModpackItemDialog")

const ModpackItem = reatomComponent<Modpack>(({
  ctx, version, client, name, mods, shaders, downloadLink, id, imageUrl
}) => {
  return (
    <div className="flex flex-col rounded-xl gap-4 justify-between h-full bg-neutral-950 p-4 relative">
      <div className="flex flex-col gap-2 justify-between grow">
        <Typography className="text-xl lg:text-2xl text-project-color">
          {name}
        </Typography>
        <div className="flex items-center gap-2">
          <Typography color="white" className='text-lg'>
            Клиент: {client}
          </Typography>
          <Typography color="gray" className="text-lg">
            ({version})
          </Typography>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-center w-full gap-2">
          <a href={downloadLink} target="_blank" rel="noreferrer" className='w-full md:w-1/2'>
            <Button variant="minecraft" className="py-0.5 w-full">
              <Typography color="white" className="text-xl">
                Скачать
              </Typography>
            </Button>
          </a>
          <Button
            variant="minecraft"
            onClick={() => openModpackMoreAction(ctx, id)}
            className="w-full py-0.5 md:w-1/2"
          >
            <Typography color="white" className="text-xl">
              Подробнее
            </Typography>
          </Button>
        </div>
      </div>
      <div
        className="h-[200px] group bg-cover relative overflow-hidden rounded-xl cursor-pointer"
        style={{ backgroundImage: `url("${imageUrl}")` }}
      >
        <div
          className="flex flex-col gap-4 px-4 py-12 translate-y-64 focus:translate-y-0 group-hover:translate-y-0
            absolute bottom-0 right-0 left-0 bg-black/70 backdrop-blur-2xl"
        >
          <div className="flex flex-col gap-y-1">
            <Typography className='text-lg'>Моды</Typography>
            {mods ? (
              <div className="flex items-center gap-1 flex-wrap">
                {mods.slice(0, 3).map((name, idx) =>
                  <div key={idx} className="flex bg-neutral-600/80 px-2 py-0.5 rounded-sm">
                    <Typography color="white" className="text-md">
                      {name}
                    </Typography>
                  </div>
                )}
                {(mods.length >= 3) && (
                  <div className="flex bg-neutral-600/80 px-2 py-0.5 rounded-sm">
                    <Typography color="white" className="text-md">
                      +{mods.length - 3}
                    </Typography>
                  </div>
                )}
              </div>
            ) : (
              <Typography color="gray" className="text-sm">пусто</Typography>
            )}
          </div>
          <div className="flex flex-col gap-y-1">
            <Typography className='text-lg'>
              Шейдеры
            </Typography>
            {shaders.length >= 1 ? (
              <div className="flex items-center gap-1 flex-wrap">
                {shaders.slice(0, 3).map((name, idx) =>
                  <div key={idx} className="flex bg-neutral-600/80 px-2 py-0.5 rounded-sm">
                    <Typography color="white" className="text-md">
                      {name}
                    </Typography>
                  </div>,
                )}
                {shaders.length >= 3 && (
                  <div className="flex bg-neutral-600/80 px-2 py-0.5 rounded-sm">
                    <Typography color="white" className="text-md">
                      +{shaders.length - 3}
                    </Typography>
                  </div>
                )}
              </div>
            ) : (
              <Typography color="gray" className="text-sm">пусто</Typography>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, "ModpackItem")

export type Modpack = {
  name: string,
  client: string,
  version: string,
  id: string,
  mods: Array<string>,
  downloadLink: string,
  created_at: string | Date,
  shaders: Array<string>,
  imageUrl: string
}

const modpacksAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(async () => {
    const res = await client("shared/modpack/list", { signal: ctx.controller.signal })
    const data = await res.json<{ data: Array<Modpack> } | { error: string }>()
    if ("error" in data) return null;
    return data.data
  })
}, {
  name: "modpacksAction",
  onReject: (ctx, e) => {
    if (e instanceof Error) toast.error(e.message.slice(0, 26))
  }
}).pipe(
  withDataAtom([], (_, data) => data && data.length >= 1 ? data : null),
  withStatusesAtom(),
  withCache({ swr: false })
)

const ModpackListEmpty = () => {
  return (
    <Typography className="text-neutral-400 text-2xl">
      Модпаков еще нет
    </Typography>
  )
};

const ModpackListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full xl:grid-cols-4 gap-4 grid-rows-2">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Skeleton key={idx} className="w-full h-80" />
      ))}
    </div>
  );
};

export const ModpackList = reatomComponent(({ ctx }) => {
  useUpdate(modpacksAction, []);

  const modpacks = ctx.spy(modpacksAction.dataAtom);

  if (ctx.spy(modpacksAction.statusesAtom).isPending) {
    return <ModpackListSkeleton />;
  }

  if (ctx.spy(modpacksAction.statusesAtom).isRejected || !modpacks) {
    return <ModpackListEmpty />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full xl:grid-cols-4 gap-4 grid-rows-2">
      <ModpackItemDialog />
      {modpacks.map(modpack => <ModpackItem key={modpack.id} {...modpack} />)}
    </div>
  );
}, "ModpacksList")
