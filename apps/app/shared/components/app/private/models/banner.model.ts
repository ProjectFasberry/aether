import { client, withJsonBody } from "@/shared/lib/client-wrapper"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async"
import { action, atom } from "@reatom/core"
import { withAssign, withReset } from "@reatom/framework"
import { toast } from "sonner"
import { notifyAboutRestrictRole } from "./actions.model"
import { alertDialog } from "@/shared/components/config/alert-dialog.model"

type BannersPayload = ExtractApiData<"getSharedBannerList">["data"]
type BannerPayload = BannersPayload["data"][number]

export const bannersAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() => client<BannersPayload>(`shared/banner/list`).exec())
}).pipe(withDataAtom(null), withStatusesAtom(), withCache({ swr: false }))

export const createBannerTitleAtom = atom("", "createBannerTitle").pipe(withReset())
export const createBannerDescriptionAtom = atom("", "createBannerDescription").pipe(withReset())
export const createBannerHrefTitleAtom = atom("", "createBannerHrefTitle").pipe(withReset())
export const createBannerHrefValueAtom = atom("", "createBannerHrefValue").pipe(withReset())

export const createBanner = atom(null, "createBanner").pipe(
  withAssign((_, name) => ({
    resetFull: action((ctx) => {
      createBannerTitleAtom.reset(ctx)
      createBannerDescriptionAtom.reset(ctx)
      createBannerHrefTitleAtom.reset(ctx)
      createBannerHrefValueAtom.reset(ctx)
    }),
    submit: reatomAsync(async (ctx) => {
      const json = {
        title: ctx.get(createBannerTitleAtom),
        description: ctx.get(createBannerDescriptionAtom),
        href: {
          title: ctx.get(createBannerHrefTitleAtom),
          value: ctx.get(createBannerHrefValueAtom)
        }
      }

      return await client
        .post<BannerPayload>("privated/banners/create")
        .pipe(withJsonBody(json))
        .exec()
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx, res) => {
        toast.success("Баннер создан");

        bannersAction.cacheAtom.reset(ctx)
        bannersAction.dataAtom(ctx, (state) => state ? { data: [...state.data, res], meta: state.meta } : null)
        createBanner.resetFull(ctx)
      },
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(withStatusesAtom())
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
      return await client
        .delete<{ id: number }>(`privated/banners/${id}`)
        .exec()
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx, res) => {
        toast.success("Баннер удален");
        bannersAction.dataAtom(ctx, (state) => state ? { data: state.data.filter(banner => banner.id !== res.id), meta: state.meta } : null)
      },
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(withStatusesAtom())
  }))
)