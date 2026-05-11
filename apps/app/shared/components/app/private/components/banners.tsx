import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { bannersAction, deleteBanner } from "../models/banner.model"
import { Skeleton } from "@repo/ui/skeleton"
import { Typography } from "@repo/ui/typography"
import { action, atom, type AtomState } from "@reatom/framework"
import { sleep, withReset } from "@reatom/framework"
import { IconEye } from "@tabler/icons-react"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/dialog"
import { type ReactNode } from "react"
import { actionsTypeAtom, getSelectedParentAtom } from "../models/actions.model"
import { ToActionButtonX } from "./global"
import { ActionButton, DeleteButton } from "./ui"
import {
  createBanner,
  createBannerDescriptionAtom,
  createBannerHrefTitleAtom,
  createBannerHrefValueAtom,
  createBannerTitleAtom
} from "../models/banner.model"
import { Input } from "@repo/ui/input"
import { ButtonXSubmit } from "./global"

type BannerPayload = ExtractApiData<"getSharedBannerList">["data"]["data"][number]

const CreateBannerTitle = reatomComponent(({ ctx }) => {
  return (
    <Input
      placeholder="Заголовок"
      value={ctx.spy(createBannerTitleAtom)}
      onChange={(e) => createBannerTitleAtom(ctx, e.target.value)}
    />
  )
})
const CreateBannerDescription = reatomComponent(({ ctx }) => {
  return (
    <Input
      placeholder="Описание"
      value={ctx.spy(createBannerDescriptionAtom)}
      onChange={(e) => createBannerDescriptionAtom(ctx, e.target.value)}
    />
  )
})
const CreateBannerLinkTitle = reatomComponent(({ ctx }) => {
  return (
    <Input
      placeholder="Заголовок ссылки"
      value={ctx.spy(createBannerHrefTitleAtom)}
      onChange={(e) => createBannerHrefTitleAtom(ctx, e.target.value)}
    />
  )
})
const CreateBannerLinkValue = reatomComponent(({ ctx }) => {
  return (
    <Input
      placeholder="Ссылка"
      value={ctx.spy(createBannerHrefValueAtom)}
      onChange={(e) => createBannerHrefValueAtom(ctx, e.target.value)}
    />
  )
})
const CreateBannerSubmit = reatomComponent(({ ctx }) => {
  return (
    <ButtonXSubmit
      title="Создать"
      action={() => createBanner.submit(ctx)}
      isDisabled={ctx.spy(createBanner.submit.statusesAtom).isPending}
    />
  )
}, "CreateBanner")
const CreateBannerForm = () => {
  return (
    <div className="flex flex-col gap-2">
      <CreateBannerTitle />
      <CreateBannerDescription />
      <CreateBannerLinkTitle />
      <CreateBannerLinkValue />
    </div>
  )
}

const showBannerDialogIsOpenAtom = atom(false)
const showBannerItemAtom = atom<BannerPayload | null>(null).pipe(withReset())

const controlShowBannerAction = action(async (ctx, value: boolean, id?: number) => {
  if (value) {
    if (!id) throw new Error('Target banner id is not defined')

    const item = ctx.get(bannersAction.dataAtom)?.data.find(target => target.id === id)
    if (!item) throw new Error('Target banner is not defined')

    showBannerItemAtom(ctx, item)
    showBannerDialogIsOpenAtom(ctx, true)
  } else {
    showBannerDialogIsOpenAtom(ctx, false)
    await sleep(300)
    showBannerItemAtom.reset(ctx)
  }
})

const ShowBanner = reatomComponent<{ id: number }>(({ ctx, id }) => {
  return (
    <ActionButton
      icon={IconEye}
      variant="default"
      onClick={() => controlShowBannerAction(ctx, true, id)}
    />
  )
})

const ShowBannerDialog = reatomComponent(({ ctx }) => {
  const item = ctx.spy(showBannerItemAtom);
  if (!item) return null;

  return (
    <Dialog open={ctx.spy(showBannerDialogIsOpenAtom)} onOpenChange={v => controlShowBannerAction(ctx, v)}>
      <DialogContent>
        <DialogTitle className="hidden"></DialogTitle>
        <div className="flex flex-col justify-center w-full h-full items-center">
          <Typography className='font-semibold'>
            {item.title}
          </Typography>
          <Typography>
            {item.description}
          </Typography>
          <a href={item.href.value} className="text-green-500 text-sm">
            {item.href.title}
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
})

const BannerListItem = reatomComponent<BannerPayload>(({ ctx, id, title, description, href }) => {
  return (
    <div className="flex items-center gap-2 justify-between w-full h-16 border border-neutral-800 p-2 rounded-lg overflow-hidden">
      <div className="flex w-full justify-between sm:items-start gap-1">
        <div className="flex flex-col sm:gap-1 sm:flex-row min-w-0 sm:items-center">
          <Typography className='truncate font-semibold leading-tight'>
            {title}
          </Typography>
          <Typography>
            {description}
          </Typography>
          <Typography>
            {href.title} ({href.value})
          </Typography>
        </div>
        <div className="flex items-center gap-1">
          <ShowBanner id={id} />
          <DeleteButton
            onClick={() => deleteBanner.deleteBefore(ctx, { id, title })}
            disabled={ctx.spy(deleteBanner.submit.statusesAtom).isPending}
          />
        </div>
      </div>
    </div >
  )
}, "BannerListItem")

export const BannersList = reatomComponent(({ ctx }) => {
  useUpdate(bannersAction, [])

  if (ctx.spy(bannersAction.statusesAtom).isPending) return <Skeleton className="h-16 w-full" />
  
  const data = ctx.spy(bannersAction.dataAtom)?.data;
  if (!data) return null;

  return (
    <>
      <ShowBannerDialog />
      <div className="flex flex-col gap-2 w-full h-full">
        {data.map(banner => <BannerListItem key={banner.id} {...banner} />)}
      </div>
    </>
  )
}, "BannersList")

const VARIANTS: Record<AtomState<typeof actionsTypeAtom>, ReactNode> = {
  "create": <CreateBannerForm />,
  "edit": null,
  "view": <BannersList />
}

export const BannersWrapper = reatomComponent(({ ctx }) => {
  if (!ctx.spy(getSelectedParentAtom("banner"))) {
    return VARIANTS["view"]
  }

  return VARIANTS[ctx.spy(actionsTypeAtom)]
}, "BannersWrapper")

export const ViewBanner = () => <ToActionButtonX title="Создать" parent="banner" type="create" />

export const EditBanner = () => {
  return (
    <div className="flex items-center gap-1">
      <ToActionButtonX parent="banner" type="edit" />
    </div>
  )
}

export const CreateBanner = () => {
  return (
    <div className="flex items-center gap-1">
      <ToActionButtonX parent="banner" type="create" />
      <CreateBannerSubmit />
    </div>
  )
}