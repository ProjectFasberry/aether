import { client, withJsonBody } from "@/shared/lib/client-wrapper"
import { logError } from "@/shared/lib/log"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async"
import { action, atom } from "@reatom/core"
import { withAssign, withReset } from "@reatom/framework"
import { toast } from "sonner"
import { notifyAboutRestrictRole } from "./actions.model"
import { alertDialog } from "@/shared/components/config/alert-dialog.model"

type BannersPayload = ExtractApiData<"getSharedBannerList">["data"]
type BannerPayload = BannersPayload["data"][number]

export const bannersAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    client<BannersPayload>(`shared/banner/list`)
      .exec()
  )
}).pipe(withDataAtom(null), withStatusesAtom(), withCache({ swr: false }))

export const createBannerTitleAtom = atom("", "createBannerTitle").pipe(withReset())
export const createBannerDescriptionAtom = atom("", "createBannerDescription").pipe(withReset())
export const createBannerHrefTitleAtom = atom("", "createBannerHrefTitle").pipe(withReset())
export const createBannerHrefValueAtom = atom("", "createBannerHrefValue").pipe(withReset())

export const createBanner = atom(null, "createBanner").pipe(
  withAssign((ctx, name) => ({
    resetFull: action((ctx) => {
      createBannerTitleAtom.reset(ctx)
      createBannerDescriptionAtom.reset(ctx)
      createBannerHrefTitleAtom.reset(ctx)
      createBannerHrefValueAtom.reset(ctx)
    }, `${name}.createBanner`)
  }))
)

export const createBannerAction = reatomAsync(async (ctx) => {
  const json = {
    title: ctx.get(createBannerTitleAtom),
    description: ctx.get(createBannerDescriptionAtom),
    href: {
      title: ctx.get(createBannerHrefTitleAtom),
      value: ctx.get(createBannerHrefValueAtom)
    }
  }

  return await ctx.schedule(() =>
    client
      .post<BannerPayload>("privated/banners/create")
      .pipe(withJsonBody(json))
      .exec()
  )
}, {
  name: 'createBannerAction',
  onFulfill: (ctx, res) => {
    toast.success("Баннер создан");

    bannersAction.cacheAtom.reset(ctx)
    bannersAction.dataAtom(ctx, 
      (state) => state ? { data: [...state.data, res], meta: state.meta } : null
    )

    createBanner.resetFull(ctx)
  },
  onReject: (ctx, e) => {
    notifyAboutRestrictRole(e)
    logError(e)
  }
}).pipe(withStatusesAtom())

// 
const itemToRemoveAtom = atom<{ id: number, title: string } | null>(null, "itemToRemove").pipe(withReset())

export const deleteBannerBeforeAction = action((ctx, item: { id: number, title: string }) => {
  itemToRemoveAtom(ctx, item)

  alertDialog.open(ctx, {
    title: `Вы точно хотите удалить "${item.title}"?`,
    confirmAction: action((ctx => deleteBannerAction(ctx, item.id))),
    confirmLabel: "Удалить",
    cancelAction: action((ctx) => itemToRemoveAtom.reset(ctx)),
    autoClose: true
  });
}, "deleteBannerBeforeAction")

export const deleteBannerAction = reatomAsync(async (ctx, id: number) => {
  return await ctx.schedule(() =>
    client
      .delete<{ id: number }>(`privated/banners/${id}`)
      .exec()
  )
}, {
  name: "deleteBannerAction",
  onFulfill: (ctx, res) => {
    toast.success("Баннер удален");
    bannersAction.dataAtom(ctx, 
      (state) => state ? { data: state.data.filter(banner => banner.id !== res.id), meta: state.meta } : null
    )
  },
  onReject: (ctx, e) => {
    notifyAboutRestrictRole(e)
    logError(e)
  }
}).pipe(withStatusesAtom())