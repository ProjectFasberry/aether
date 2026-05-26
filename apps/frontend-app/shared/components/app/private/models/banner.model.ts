import { client, withJsonBody } from "@/shared/lib/client-wrapper"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework"
import { action, atom } from "@reatom/framework"
import { withAssign, withReset } from "@reatom/framework"
import { toast } from "sonner"
import { notifyAboutRestrictRole } from "./actions.model"
import { alertDialog } from "@/shared/components/config/alert-dialog/alert-dialog.model"

export const banners = atom(null, "banners").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client<ExtractApiData<"getSharedBannerList">["data"]>(`shared/banner/list`).exec()
      )
    }, `${name}.fetch`).pipe(
      withDataAtom(null),
      withStatusesAtom(),
      withCache({ swr: false })
    )
  }))
)

export const createBannerState = atom(null).pipe(
  withAssign((_, name) => ({
    title: atom("").pipe(withReset()),
    desc: atom("").pipe(withReset()),
    hrefTitle: atom("").pipe(withReset()),
    hrefValue:  atom("").pipe(withReset())
  }))
)
export const createBanner = atom(null, "createBanner").pipe(
  withAssign((_, name) => ({
    resetFull: action((ctx) => {
      createBannerState.title.reset(ctx)
      createBannerState.desc.reset(ctx)
      createBannerState.hrefTitle.reset(ctx)
      createBannerState.hrefValue.reset(ctx)
    }),
    submit: reatomAsync(async (ctx) => {
      const json: ExtractApiBody<"postPrivatedBannersCreate">["content"]["application/json"] = {
        title: ctx.get(createBannerState.title),
        description: ctx.get(createBannerState.desc),
        href: {
          title: ctx.get(createBannerState.hrefTitle),
          value: ctx.get(createBannerState.hrefValue)
        }
      }

      return await client
        .post<ExtractApiData<"postPrivatedBannersCreate">["data"]>("privated/banners/create")
        .pipe(withJsonBody(json))
        .exec()
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx, res) => {
        toast.success("Баннер создан");

        banners.fetch.cacheAtom.reset(ctx)
        banners.fetch.dataAtom(ctx, (state) => state ? { data: [...state.data, res], meta: state.meta } : null);

        createBanner.resetFull(ctx)
      },
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(
      withStatusesAtom()
    )
  }))
)

const itemToRemoveAtom = atom<{ id: number, title: string } | null>(null, "itemToRemove").pipe(withReset())

export const deleteBanner = atom(null, "deleteBanner").pipe(
  withAssign((_, name) => ({
    deleteBefore: action((ctx, item: { id: number, title: string }) => {
      itemToRemoveAtom(ctx, item)

      alertDialog.open(ctx, {
        title: `Вы точно хотите удалить "${item.title}"?`,
        confirmAction: action((ctx => deleteBanner.submit(ctx, item.id))),
        confirmLabel: "Удалить",
        cancelAction: action((ctx) => itemToRemoveAtom.reset(ctx)),
        autoClose: true
      });
    }, `${name}.deleteBefore`),
    submit: reatomAsync(async (ctx, id: number) => {
      const result = await client
        .delete<ExtractApiData<"deletePrivatedBannersById">["data"]>(`privated/banners/${id}`)
        .exec();

      return { result, id }
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx, res) => {
        toast.success("Баннер удален");

        banners.fetch.dataAtom(ctx, (state) => {
          if (!state) return null;

          return {
            data: state.data.filter(b => b.id !== res.id),
            meta: state.meta
          }
        })
      },
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(
      withStatusesAtom()
    )
  }))
)
