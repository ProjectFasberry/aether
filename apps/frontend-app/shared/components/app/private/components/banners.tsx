import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Skeleton } from "@/shared/ui/skeleton"
import { Typography } from "@/shared/ui/typography"
import { type AtomState } from "@reatom/framework"
import { IconEye } from "@tabler/icons-react"
import { type ReactNode } from "react"
import { actionsTypeAtom, getSelectedParentAtom } from "../models/actions.model"
import { ToActionButtonX } from "./global"
import { ActionButton, DeleteButton } from "./ui"
import { banners, deleteBanner, createBanner, createBannerState } from "../models/banner.model"
import { Input } from "@/shared/ui/input"
import { ButtonXSubmit } from "./global"
import { Dialog } from "@ark-ui/react/dialog"
import { Portal } from "@ark-ui/react/portal"
import { dialogBackdropVariant, DialogClose, dialogContentVariant, dialogPositionerVariant } from "@/shared/ui/dialog"
import { Tooltip } from "@ark-ui/react/tooltip"

type BannerPayload = ExtractApiData<"getSharedBannerList">["data"]["data"][number]

const CREATE_BANNER_FIELDS = [
  { placeholder: "Заголовок", value: createBannerState.title },
  { placeholder: "Описание", value: createBannerState.desc },
  { placeholder: "Заголовок ссылки", value: createBannerState.hrefTitle },
  { placeholder: "Ссылка", value: createBannerState.hrefValue },
]
const CreateBannerSubmit = reatomComponent(({ ctx }) => {
  return (
    <ButtonXSubmit
      title="Создать"
      action={() => createBanner.submit(ctx)}
      isDisabled={ctx.spy(createBanner.submit.statusesAtom).isPending}
    />
  )
}, "CreateBanner")

const CreateBannerField = reatomComponent<typeof CREATE_BANNER_FIELDS[number]>(({ ctx, placeholder, value }) => {
  return (
    <Input
      placeholder={placeholder}
      value={ctx.spy(value)}
      onChange={e => value(ctx, e.target.value)}
    />
  )
}, "CreateBannerField")

const CreateBannerForm = () => {
  return (
    <div className="flex flex-col gap-2">
      {CREATE_BANNER_FIELDS.map((item, idx) => <CreateBannerField key={idx} {...item} />)}
    </div>
  )
}

const BannerListItem = reatomComponent<BannerPayload>(({ ctx, id, title, description, href }) => {
  return (
    <div className="flex items-center gap-2 justify-between w-full h-16 border border-neutral-800 p-2 rounded-lg overflow-hidden">
      <div className="flex w-full justify-between sm:items-start gap-1">
        <div className="flex flex-col sm:gap-1 sm:flex-row min-w-0 sm:items-center">
          <div className="flex flex-col">
            <Typography className='truncate font-semibold leading-tight'>
              {title}
            </Typography>
            <Typography>
              {description}
            </Typography>
          </div>
          <Tooltip.Root>
            <Tooltip.Trigger >
              <Typography color="gray">{href.title}</Typography>
            </Tooltip.Trigger>
            <Portal>
              <Tooltip.Positioner>
                <Tooltip.Arrow>
                  <Tooltip.ArrowTip />
                </Tooltip.Arrow>
                <Tooltip.Content className="bg-neutral-900 rounded-xl">
                  {href.value}
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Portal>
          </Tooltip.Root>
        </div>
        <div className="flex items-center gap-1">
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <ActionButton icon={IconEye} variant="default" />
            </Dialog.Trigger>
            <Portal>
              <Dialog.Backdrop className={dialogBackdropVariant()} />
              <Dialog.Positioner className={dialogPositionerVariant()}>
                <Dialog.Content className={dialogContentVariant({ className: "overflow-hidden w-1/3" })}>
                  <div className="flex flex-col justify-center w-full h-full items-center">
                    <Typography className='font-semibold'>
                      {title}
                    </Typography>
                    <Typography>
                      {description}
                    </Typography>
                    <a href={href.value} className="text-green-500 text-sm">
                      {href.title}
                    </a>
                  </div>
                  <DialogClose />
                </Dialog.Content>
              </Dialog.Positioner>
            </Portal>
          </Dialog.Root>
          <DeleteButton
            onClick={() => deleteBanner.deleteBefore(ctx, { id, title })}
            disabled={ctx.spy(deleteBanner.submit.statusesAtom).isPending}
          />
        </div>
      </div>
    </div >
  )
}, "BannerListItem")

const BannersList = reatomComponent(({ ctx }) => {
  useUpdate(banners.fetch, [])

  if (ctx.spy(banners.fetch.statusesAtom).isPending) {
    return Array.from({ length: 3 }).map((_, idx) => <Skeleton key={idx} className="h-16 w-full" />)
  }

  const data = ctx.spy(banners.fetch.dataAtom)?.data;
  if (!data) return null;

  return data.map(b => <BannerListItem key={b.id} {...b} />)
}, "BannersList")

const VARIANTS: Record<AtomState<typeof actionsTypeAtom>, ReactNode> = {
  "create": <CreateBannerForm />,
  "edit": null,
  "view": (
    <div className="flex flex-col gap-2 w-full h-full">
      <BannersList />
    </div>
  )
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
