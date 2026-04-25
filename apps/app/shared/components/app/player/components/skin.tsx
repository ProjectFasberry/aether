import { useUpdate } from "@reatom/npm-react";
import { playerParamAtom } from "../models/player.model";
import { spawn } from "@reatom/framework";
import { tv } from "tailwind-variants";
import { reatomComponent } from "@reatom/npm-react";
import { Skeleton } from "@repo/ui/skeleton";
import { Typography } from "@repo/ui/typography";
import React, { useEffect, useRef, useState } from "react";
import { IconPlus, IconRotate, IconUpload, IconX } from "@tabler/icons-react";
import { isClientAtom } from "@/shared/models/page-context.model";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@repo/ui/dialog";
import {
  getIsSelectSkinAtom, getIsUploadAvailableAtom, getSkinVariantIsActiveAtom, skins, skinsState, skinSubmitIsDisabledAtom,
  SkinVariant, skinAnimation,  SKIN_ANIMATIONS, hardwareAccIsEnabledAtom
} from "../models/skin.model";
import { SkinsHistory } from "@repo/shared/types/entities/other";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { ReactSkinview3d } from "react-skinview3d"
import { ClientOnly } from "vike-react/ClientOnly"

const SkinRenderSkeleton = () => {
  return (
    <div className="flex items-center justify-center w-2/3 rounded-lg h-[390px]">
      <Skeleton className="w-full h-full" />
    </div>
  )
}

const SkinRender = reatomComponent(({ ctx }) => {
  if (!ctx.spy(isClientAtom) || ctx.spy(skins.fetch.statusesAtom).isPending) {
    return <SkinRenderSkeleton />;
  }

  const skin = ctx.spy(skinsState.selected)
  if (!skin) return null;

  return (
    <div className="flex items-center h-[390px] justify-center overflow-hidden w-full">
      {ctx.spy(hardwareAccIsEnabledAtom) ? (
        <ClientOnly fallback={<SkinRenderSkeleton />}>
          <ReactSkinview3d
            skinUrl={skin.skin_url!}
            height="390"
            width="300"
            options={{ zoom: 0.8 }}
            onReady={({ viewer }) => skinAnimation.viewer(ctx, viewer)}
          />
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

const SkinsHistoryItem = reatomComponent<SkinsHistory & { variant: "mobile" | "desktop" }>(({
  ctx, variant, skin_head_url, skin_url, skin_identifier: identifier, skin_variant
}) => {
  const selectedSkin = ctx.spy(skinsState.selected);

  const status = selectedSkin?.identifier === identifier
    ? "active"
    : "inactive"

  const handle = () => {
    skinsState.selected(ctx, {
      identifier,
      skin_url: skin_url ?? null,
      skin_head_url: skin_head_url ?? null
    })
  }

  return (
    <div
      className={skinHeadVariant({ status, size: "small" })}
      onClick={handle}
    >
      <Avatar
        src={skin_head_url!}
        width={variant === 'mobile' ? 128 : 36}
        height={variant === 'mobile' ? 128 : 36}
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
  if (!ctx.spy(isClientAtom) || ctx.spy(skins.fetch.statusesAtom).isPending) {
    return <SkinsHistoryListSkeleton />
  }

  const data = ctx.spy(skins.fetch.dataAtom)
  if (!data) return null;

  return data.map(d => <SkinsHistoryItem key={d.skin_identifier} variant={variant} {...d} />)
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

  useEffect(() => {
    src !== null && setAvatar(src)
  }, [src])

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
  if (!ctx.spy(isClientAtom) || ctx.spy(skins.fetch.statusesAtom).isPending) {
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

const SkinRenderWrapper = () => {
  return (
    <div className="flex flex-col justify-between w-full lg:min-h-[450px] lg:border lg:border-neutral-600 rounded-xl">
      <div className="flex flex-col order-last lg:order-first py-4 items-center gap-2 w-full h-full">
        <div className="hidden lg:flex">
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
  )
}

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
    <Dialog
      open={ctx.spy(skinsState.control.dialogIsOpen)}
      onOpenChange={v => skinsState.control.dialogIsOpen(ctx, v)}
    >
      <DialogTrigger asChild>
        <Button
          className={skinControlVariants({ variant: "default", className: "p-0 hover:bg-neutral-800" })}
        >
          <IconUpload size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="text-2xl text-center">Загрузка скина</DialogTitle>
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
              {skinsState.control.SKIN_VARIANTS.map((d) => <SkinVariantItem key={d} variant={d} />)}
            </div>
          </div>
          <SkinControlChangeSubmit />
        </div>
      </DialogContent>
    </Dialog>
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
  const variant = ctx.spy(skinAnimation.isRotate) ? "active" : "default"

  return (
    <div
      key="rotate"
      onClick={() => skinAnimation.isRotate(ctx, (state) => !state)}
      className={skinControlVariants({ variant })}
    >
      <IconRotate size={18} />
    </div>
  )
}, "SkinControlRotate")

const SkinControlsList = reatomComponent(({ ctx }) => {
  const variant = (c: typeof SKIN_ANIMATIONS[number]) => ctx.spy(skinAnimation.type) === c.animation
    ? "active" : "default"

  return (
    SKIN_ANIMATIONS.map((control, i) => (
      <div
        key={i}
        onClick={() => skinAnimation.type(ctx, control.animation)}
        className={skinControlVariants({ variant: variant(control) })}
      >
        <control.icon size={18} />
      </div>
    ))
  )
}, "SkinControlsList")

const SkinControls = () => {
  return (
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
  );
}

export const PlayerSkin = reatomComponent(({ ctx }) => {
  const nickname = ctx.spy(playerParamAtom);

  useUpdate((ctx) => {
    if (!nickname) return;
    skins.init(ctx, nickname)
  }, [nickname])

  return (
    <div className="flex flex-col h-full gap-4 w-full">
      <SkinRenderWrapper />
      <SkinControls />
    </div>
  )
}, "PlayerSkin")