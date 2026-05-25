import { spawn } from "@reatom/framework";
import { tv } from "tailwind-variants";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { Typography } from "@/shared/ui/typography"
import React, { useRef, useState } from "react";
import { IconButterfly, IconManFilled, IconPlus, IconRotate, IconRun, IconUpload, IconX, type TablerIcon } from "@tabler/icons-react";
import { pageState } from "@/shared/models/page-context.model";
import { Button } from "@/shared/ui/button";
import { type SkinAnimationType, skinModel, type SkinVariant, type SkinsHistory } from "../models/skin.model";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { ReactSkinview3d } from "react-skinview3d"
import { ClientOnly } from "vike-react/ClientOnly"
import { appState } from "@/shared/models/app/index.model";
import { Dialog, DialogTitle } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { dialogBackdropVariant, dialogContentVariant, dialogPositionerVariant } from "@/shared/ui/dialog";

const {
  getIsSelectSkinAtom,
  getSkinVariantIsActiveAtom,
  skinSubmitIsDisabledAtom,
  getIsUploadAvailableAtom,
  skins,
  skinsState,
  skin,
  SKIN_VARIANTS
} = skinModel()

const SkinRenderSkeleton = () => {
  return (
    <div className="flex items-center justify-center px-6 w-full rounded-lg h-[390px]">
      <Skeleton className="w-full h-full" />
    </div>
  )
}

const SkinRender = reatomComponent(({ ctx }) => {
  useUpdate(skins.init, []);

  if (!ctx.spy(pageState.isClientside) || ctx.spy(skins.fetch.statusesAtom).isPending) {
    return <SkinRenderSkeleton />;
  }

  const skinData = ctx.spy(skinsState.selected)
  if (!skinData) return <p>ничего нет</p>

  return (
    <div className="flex items-center h-[390px] justify-center overflow-hidden w-full">
      {ctx.spy(appState.inited.hardwaveIsEnabled) ? (
        <ClientOnly fallback={<SkinRenderSkeleton />}>
          {skinData.skin_url && (
            <ReactSkinview3d
              skinUrl={skinData.skin_url}
              height="390"
              width="300"
              options={{ zoom: 0.8 }}
              onReady={({ viewer }) => skin.animation.viewer(ctx, viewer)}
            />
          )}
        </ClientOnly>
      ) : (
        <div className="flex w-full px-2 py-6 items-center justify-center h-full">
          <Typography color="gray" className="text-lg truncate text-center whitespace-pre-wrap">
            Графическое аппаратное ускорение не включено
          </Typography>
        </div>
      )}
    </div>
  );
}, "SkinRender")

const skinHeadVariant = tv({
  base: `flex items-center select-none justify-center *:rounded-lg p-0.5 aspect-square rounded-lg overflow-hidden cursor-pointer border-2`,
  variants: {
    status: {
      active: "border-green-600",
      inactive: "border-neutral-600"
    },
    variant: {
      default: "border-2",
      unbordered: "border-none"
    },
    size: {
      small: "w-12 h-12",
      medium: "w-32 h-32"
    }
  },
  defaultVariants: {
    status: "inactive",
    size: "small",
    variant: "default"
  }
})

const SKINS_HISTORY_AVATAR_SIZES = [128, 36]

const SkinsHistoryItem = reatomComponent<SkinsHistory & { variant: "mobile" | "desktop" }>(({
  ctx, variant, skin_head_url, skin_url, skin_identifier: identifier, skin_variant
}) => {
  if (!skin_head_url) return null;

  const selectedSkin = ctx.spy(skinsState.selected);

  const handleClick = () => {
    skinsState.selected(ctx, {
      identifier,
      skin_url: skin_url ?? null,
      skin_head_url: skin_head_url ?? null
    })
  }

  const status = selectedSkin?.identifier === identifier
    ? "active"
    : "inactive"

  return (
    <div className={skinHeadVariant({ status, size: "small" })} onClick={handleClick}>
      <Avatar
        src={skin_head_url}
        width={variant === 'mobile' ? SKINS_HISTORY_AVATAR_SIZES[0] : SKINS_HISTORY_AVATAR_SIZES[1]}
        height={variant === 'mobile' ? SKINS_HISTORY_AVATAR_SIZES[0] : SKINS_HISTORY_AVATAR_SIZES[1]}
      />
    </div>
  )
}, "SkinsHistoryItem")

const SkinsHistoryListSkeleton = () => {
  return (
    <>
      <div className={skinHeadVariant({ status: "active" })}>
        <Skeleton className="h-full w-full" />
      </div>
      <div className={skinHeadVariant({ status: "inactive" })}>
        <Skeleton className="h-full w-full" />
      </div>
      <div className={skinHeadVariant({ status: "inactive" })}>
        <Skeleton className="h-full w-full" />
      </div>
    </>
  )
}

const SkinsHistoryList = reatomComponent<{ variant: "mobile" | "desktop" }>(({ ctx, variant }) => {
  if (!ctx.spy(pageState.isClientside) || ctx.spy(skins.fetch.statusesAtom).isPending) {
    return <SkinsHistoryListSkeleton />
  }

  const data = ctx.spy(skins.fetch.dataAtom)
  if (!data) return null;

  return data.map(item => (
    <SkinsHistoryItem
      key={item.skin_identifier}
      variant={variant}
      skin_head_url={item.skin_head_url}
      skin_identifier={item.skin_identifier}
      skin_url={item.skin_url}
      skin_variant={item.skin_variant}
      timestamp={item.timestamp}
    />
  ))
}, "SkinsHistoryList")

const SkinMainHeadSkeleton = () => {
  return (
    <div className={skinHeadVariant({ status: "active", size: "medium", variant: "unbordered" })}>
      <Skeleton className="h-full w-full" />
    </div>
  )
}

const Avatar = reatomComponent<{ width: number, height: number, src: string }>(({ ctx, src, ...props }) => {
  const [avatar, setAvatar] = useState<string | null>(src);

  return (
    <img
      src={avatar!}
      alt=""
      draggable={false}
      onError={() => setAvatar(getStaticImage("fallback/steve_head.png"))}
      {...props}
    />
  )
}, "Avatar")

const SkinMainHead = reatomComponent(({ ctx }) => {
  if (!ctx.spy(pageState.isClientside) || ctx.spy(skins.fetch.statusesAtom).isPending) {
    return <SkinMainHeadSkeleton />
  }

  const data = ctx.spy(skinsState.selected)
  if (!data) return null;

  return (
    <div className={skinHeadVariant({ status: "active", size: "medium", variant: "unbordered" })}>
      <Avatar src={data.skin_head_url!} width={128} height={128} />
    </div>
  )
}, "SkinMainHead")

const skinControlVariants = tv({
  base: `flex items-center justify-center cursor-pointer
    border border-neutral-800 rounded-xl min-w-10 min-h-10 h-10 w-10`,
  variants: {
    variant: {
      default: "bg-transparent",
      active: "bg-neutral-700/80"
    }
  },
  defaultVariants: {
    variant: "default"
  }
})

const SkinVariantItem = reatomComponent<{ variant: SkinVariant }>(({ ctx, variant }) => {
  return (
    <Button
      onClick={() => skinsState.control.variant(ctx, variant)}
      background={ctx.spy(getSkinVariantIsActiveAtom(variant)) ? "white" : "default"}
      className="flex items-center justify-center w-full"
    >
      <Typography className="font-semibold capitalize tracking-6">
        {variant}
      </Typography>
    </Button>
  )
}, "SkinVariantItem")

const va = tv({
  base: `flex items-center flex-col py-6 px-4 duration-300 hover:bg-neutral-800/60 cursor-pointer gap-2
    border-2 border-dashed border-neutral-800 w-full rounded-lg`
})

const SelectedSkinData = reatomComponent(({ ctx }) => {
  if (ctx.spy(skins.control.setupSkinData.statusesAtom).isPending) {
    return (
      <div className={va()}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9" />
            <div className='flex flex-col gap-1'>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    )
  }

  const data = ctx.spy(skinsState.control.fileData)
  if (!data) return null;

  return (
    <div className={va()}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9">
            <img src={data.url} draggable={false} width={36} height={36} alt="" />
          </div>
          <div className='flex flex-col gap-1 min-w-0'>
            <Typography className='leading-3 truncate font-semibold text-sm'>
              {data.name}
            </Typography>
            <Typography className="text-neutral-400 text-sm">
              {data.size}
            </Typography>
          </div>
        </div>
        <IconX
          size={20}
          className="text-neutral-400"
          onClick={() => skinsState.control.file.reset(ctx)}
        />
      </div>
    </div>
  )
}, "SelectedSkinData")

const SkinControlInput = reatomComponent(({ ctx }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(true);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    void spawn(ctx, (spawnCtx) => skinsState.control.file(spawnCtx, file))
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target || !e.target.files) return;

    const file = e.target.files[0];
    if (!file) return;

    void spawn(ctx, (spawnCtx) => skinsState.control.file(spawnCtx, file))
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={va({ className: `${drag && "bg-neutral-800"}` })}
    >
      <input ref={inputRef} onChange={onChange} type="file" className="hidden" />
      <div className='flex items-center justify-center rounded-lg h-10 w-10 border border-neutral-800'>
        <IconUpload size={24} className="text-neutral-400" />
      </div>
      <Typography className="font-semibold tracking-6">
        Перетяните или выберите файл
      </Typography>
    </div>
  )
}, 'SkinControlInput')

const SkinControlContent = reatomComponent(
  ({ ctx }) => ctx.spy(skinsState.control.file) ? <SelectedSkinData /> : <SkinControlInput />,
  "SkinControlContent"
)

const SkinControlChangeSubmit = reatomComponent(({ ctx }) => {
  return (
    <Button
      disabled={ctx.spy(skinSubmitIsDisabledAtom)}
      onClick={() => void spawn(ctx, (spawnCtx) => skins.control.change(spawnCtx))}
      background="default"
      withSpinner={true}
      isLoading={ctx.spy(skins.control.change.statusesAtom).isPending}
    >
      <Typography className="font-semibold text-base">
        Загрузить
      </Typography>
    </Button>
  )
}, "SkinControlChangeSubmit")

const SkinControlChangeSkin = reatomComponent(({ ctx }) => {
  const isVisible = ctx.spy(getIsUploadAvailableAtom)
  if (!isVisible) return null;

  return (
    <Dialog.Root open={ctx.spy(skinsState.control.isOpen)} onOpenChange={v => skinsState.control.isOpen(ctx, v.open)}>
      <Dialog.Trigger asChild>
        <Button
          className={skinControlVariants({ variant: "default", className: "p-0 hover:bg-neutral-800" })}
        >
          <IconUpload size={18} />
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop className={dialogBackdropVariant()} />
        <Dialog.Positioner className={dialogPositionerVariant()}>
          <Dialog.Content className={dialogContentVariant({ className: "overflow-hidden h-2/3" })}>
            <DialogTitle>
              Загрузка скина
            </DialogTitle>
            <div className="flex flex-col gap-6 w-full">
              <div className='flex flex-col items-start gap-2 w-full'>
                <div className="flex flex-col">
                  <Typography className="font-bold leading-4 tracking-6">
                    Загрузи файл скина (в формате .png)
                  </Typography>
                  <Typography className="text-neutral-400 text-sm">
                    Размер должен быть не больше 1 МБ
                  </Typography>
                </div>
                <SkinControlContent />
              </div>
              <div className="flex flex-col items-start gap-2 w-full">
                <Typography className="font-bold tracking-6">
                  Выбери тип скина
                </Typography>
                <div className="flex bg-neutral-800 rounded-lg *:h-10 items-center *:rounded-lg justify-between p-1 w-full">
                  {SKIN_VARIANTS.map((d) => <SkinVariantItem key={d} variant={d} />)}
                </div>
              </div>
              <SkinControlChangeSubmit />
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}, 'SkinControlChangeSkin')

const SkinSetButton = reatomComponent(({ ctx }) => {
  const isVisible = ctx.spy(getIsSelectSkinAtom)
  if (!isVisible) return null;

  return (
    <Button
      className={skinControlVariants({ variant: "default", className: "p-0 hover:bg-neutral-800" })}
      onClick={() => skins.control.set(ctx)}
    >
      <IconPlus size={18} />
    </Button>
  )
}, "SkinSetButton")

const SkinControlRotate = reatomComponent(({ ctx }) => {
  const variant = ctx.spy(skin.animation.isRotate) ? "active" : "default"

  return (
    <div
      key="rotate"
      onClick={() => skin.animation.isRotate(ctx, (state) => !state)}
      className={skinControlVariants({ variant })}
    >
      <IconRotate size={18} />
    </div>
  )
}, "SkinControlRotate")

const SKIN_ANIMATIONS: { animation: SkinAnimationType; icon: TablerIcon }[] = [
  { animation: "idle", icon: IconManFilled },
  { animation: "run", icon: IconRun, },
  { animation: "flying", icon: IconButterfly },
];

const SkinControlsList = reatomComponent(({ ctx }) => {
  const variant = (c: typeof SKIN_ANIMATIONS[number]) => ctx.spy(skin.animation.type) === c.animation
    ? "active" : "default"

  return (
    SKIN_ANIMATIONS.map((control, i) => (
      <div
        key={i}
        onClick={() => skin.animation.type(ctx, control.animation)}
        className={skinControlVariants({ variant: variant(control) })}
      >
        <control.icon size={18} />
      </div>
    ))
  )
}, "SkinControlsList")

export const PlayerSkin = () => {
  return (
    <div className="flex flex-col h-full gap-4 w-full">
      <div className="flex flex-col justify-between w-full lg:min-h-[450px] lg:border lg:border-neutral-600 rounded-xl">
        <div className="flex flex-col order-last lg:order-first py-4 items-center gap-2 w-full h-full">
          <div className="hidden lg:flex w-full">
            <SkinRender />
          </div>
          <div className="flex items-center justify-center gap-2 w-full h-full">
            <SkinsHistoryList variant="desktop" />
          </div>
        </div>
        <div className="flex lg:hidden lg:order-last justify-center items-center w-full">
          <SkinMainHead />
        </div>
      </div>
      <div className="hidden lg:flex flex-col items-center w-full justify-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center gap-1 w-full">
            <SkinControlsList />
            <SkinControlRotate />
          </div>
          <div className='flex items-center gap-1'>
            <SkinControlChangeSkin />
            <SkinSetButton />
          </div>
        </div>
      </div >
    </div>
  )
}
