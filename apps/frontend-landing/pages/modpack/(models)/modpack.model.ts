import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from '@reatom/framework';
import { client } from '@/shared/api/client';
import { toast } from 'solid-sonner';
import { action, atom, withAssign } from '@reatom/framework';
import { withReset } from '@reatom/framework';
import { isError } from '@/shared/lib/helpers';

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

export const modpacksModel = () => {
  const modpacksState = atom(null, "modpacksState").pipe(
    withAssign((_, name) => ({
      item: atom<Modpack | null>(null, `${name}.item`).pipe(withReset()),
      isOpen: atom(false, `${name}.isOpen`)
    }))
  )

  const modpacks = atom(null, "modpacks").pipe(
    withAssign((_, name) => ({
      open: action((ctx, id: string) => {
        const data = ctx.get(modpacks.fetch.dataAtom);
        if (!data) throw new Error("Modpacks is not defined")

        const modpack = data.find(target => target.id === id)
        if (!modpack) throw new Error("Modpack is not defined");

        modpacksState.item(ctx, modpack);
        modpacksState.isOpen(ctx, true);
      }, `${name}.open`),
      fetch: reatomAsync(async (ctx) => {
        return await ctx.schedule(async () => {
          const res = await client("shared/modpack/list", { signal: ctx.controller.signal })
          const data = await res.json<{ data: Array<Modpack> } | { error: string }>()
          if ("error" in data) return null;
          return data.data
        })
      }, {
        name: `${name}.fetch`,
        onReject: (_, e) => {
          if (isError(e)) {
            toast.error(e.message.slice(0, 26))
          }
        }
      }).pipe(
        withDataAtom([], (_, data) => data && data.length >= 1 ? data : null),
        withStatusesAtom(),
        withCache({ swr: false })
      )
    }))
  )

  modpacksState.isOpen.onChange((ctx, state) => {
    if (!state) {
      modpacksState.item.reset(ctx)
    }
  })

  return {
    modpacks,
    modpacksState
  }
}
