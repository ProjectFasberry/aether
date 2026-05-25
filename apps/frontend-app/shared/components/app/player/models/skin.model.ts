import { reatomAsync, spawn, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework";
import { action, atom, batch } from "@reatom/framework";
import { sleep, withAssign, withReset } from "@reatom/framework";
import { logError } from "@/shared/lib/log";
import { client } from "@/shared/lib/client-wrapper";
import { isIdentityAtom, playerState } from "./player.model";
import { toast } from "sonner";
import { DEFAULT_SOFT_DELAY, DIALOG_DELAY, ENVIRONMENT } from "@/shared/consts";
import { FlyingAnimation, IdleAnimation, RunningAnimation, SkinViewer } from "skinview3d";
import { appState } from "@/shared/models/app/index.model";
import { isEmptyArray } from "@/shared/lib/helpers";

type SkinSelected = {
  skin_head_url: string | null,
  skin_url: string | null,
  identifier: string
}

const SKIN_VARIANTS = ["classic", "slim"] as const
const SKIN_DEFAULT_VARIANT = SKIN_VARIANTS[0]

export type SkinVariant = typeof SKIN_VARIANTS[number]
type SkinFileData = { name: string, size: number, url: string }
export type SkinsHistory = NonNullable<ExtractApiData<"getServerSkinHistoryByNickname">["data"]>[number]

const getIsUploadAvailableAtom = atom<boolean>((ctx) => ctx.spy(isIdentityAtom));

const skinSubmitIsDisabledAtom = atom<boolean>((ctx) => {
  if (ctx.spy(skins.control.change.statusesAtom).isPending) return true;
  return !ctx.spy(skinsState.control.file);
})

const getSkinVariantIsActiveAtom = (t: string) => atom((ctx) => ctx.spy(skinsState.control.variant) === t)

const getIsSelectSkinAtom = atom<boolean>((ctx) => {
  if (!ctx.spy(isIdentityAtom)) return false;

  const state = ctx.spy(skins.fetch.dataAtom)
  if (!state) return false;

  return state[0].skin_identifier !== ctx.spy(skinsState.selected)?.identifier
})

const skinsState = atom(null, "skinsState").pipe(
  withAssign((_, name) => ({
    selected: atom<Nullable<SkinSelected>>(null, `${name}.selected`).pipe(withReset()),
    control: atom(null, `${name}.state`).pipe(
      withAssign((_, name) => ({
        isOpen: atom(false, `${name}.isOpen`).pipe(withReset()),
        file: atom<Nullable<File>>(null, `${name}.file`).pipe(
          withAssign((target) => ({
            reset: action((ctx) => {
              const url = ctx.get(skinsState.control.fileData)?.url
              if (!url) return;

              URL.revokeObjectURL(url);
              target(ctx, null);

              skinsState.control.fileData.reset(ctx)
            })
          }))
        ),
        fileData: atom<Nullable<SkinFileData>>(null, `${name}.fileData`).pipe(withReset()),
        variant: atom<SkinVariant>(SKIN_DEFAULT_VARIANT, `${name}.variant`).pipe(withReset()),
      }))
    )
  }))
)

const skin = atom(null, "skin").pipe(
  withAssign((_, name) => ({
    animation: atom(null, `${name}.animation`).pipe(
      withAssign((_, name) => ({
        type: atom<SkinAnimationType>("idle", `${name}.type`),
        isRotate: atom<boolean>(false, `${name}.isRotate`),
        viewer: atom<Nullable<SkinViewer>>(null, `${name}.viewer`)
      }))
    )
  }))
)

export type SkinAnimationType = "idle" | "run" | "flying";
type SkinAnimation = typeof FlyingAnimation | typeof IdleAnimation | typeof RunningAnimation

const animationClasses: Record<SkinAnimationType, SkinAnimation> = {
  idle: IdleAnimation,
  run: RunningAnimation,
  flying: FlyingAnimation,
};

skin.animation.isRotate.onChange((ctx, state) => {
  let viewer = ctx.get(skin.animation.viewer)
  if (!viewer) return;

  viewer.autoRotate = state
  skin.animation.viewer(ctx, viewer)
})

skin.animation.type.onChange((ctx, state) => {
  let viewer = ctx.get(skin.animation.viewer)
  if (!viewer) return;

  viewer.animation = new animationClasses[state]();
  skin.animation.viewer(ctx, viewer)
})

const skins = atom(null, "skins").pipe(
  withAssign((_, name) => ({
    control: atom(null, `${name}.control`).pipe(
      withAssign(() => ({
        setupSkinData: reatomAsync(async (ctx) => {
          const target = ctx.get(skinsState.control.file)
          if (!target) return null;

          const url = URL.createObjectURL(target)

          const info = {
            name: target.name,
            size: target.size * 1024,
            url
          }

          skinsState.control.fileData(ctx, info)
        }, {
          name: `${name}.setupSkinData`,
          onReject: (_, e) => logError(e)
        }).pipe(
          withStatusesAtom()
        ),
        set: reatomAsync(async (ctx) => {
          const selectedSkin = ctx.get(skinsState.selected)
          if (!selectedSkin) return null;

          const id = selectedSkin.identifier

          return await ctx.schedule(() =>
            client
              .get<"success" | "error">("server/skin/set", {
                searchParams: { id }, 
                retry: 1
              })
              .exec()
          )
        }, {
          name: `${name}.set`,
          onFulfill: (ctx) => {
            toast.success("Скин обновлен", { description: "Если вы в игре - перезайдите" })
            skins.updateSkinAndHead(ctx)
          },
          onReject: (_, e) => logError(e, { type: "combined" })
        }).pipe(
          withStatusesAtom()
        ),
        change: reatomAsync(async (ctx) => {
          const payloadFormData = new FormData()

          payloadFormData.append("file", ctx.get(skinsState.control.file)!)
          payloadFormData.append("variant", ctx.get(skinsState.control.variant))

          const result = await client
            .post<{ url: string }>("server/skin/upload", {
              body: payloadFormData,
              timeout: 10000
            })
            .exec()

          await ctx.schedule(() => sleep(DEFAULT_SOFT_DELAY));

          return { result }
        }, {
          name: `${name}.change`,
          onFulfill: async (ctx, res) => {
            toast.success("Скин обновлен", { description: "Если вы в игре - перезайдите" })

            skins.updateSkinAndHead(ctx)
            skinsState.control.isOpen.reset(ctx)

            await sleep(DIALOG_DELAY)

            skinsState.control.file.reset(ctx)
            skinsState.control.variant.reset(ctx)
          },
          onReject: (_, e) => logError(e, { type: "combined" })
        }).pipe(
          withStatusesAtom()
        )
      }))
    ),
    fetch: reatomAsync(async (ctx, nickname: string) => {
      skins.fetch.dataAtom.reset(ctx);

      return await ctx.schedule(() =>
        client<SkinsHistory[]>(`server/skin/history/${nickname}`, { signal: ctx.controller.signal }).exec()
      )
    }, {
      name: `${name}.fetch`,
      onFulfill: (ctx, res) => {
        if (!res) return;

        const first = res[0]
        if (!first) return;

        skinsState.selected(ctx, {
          skin_url: first.skin_url!,
          skin_head_url: first.skin_head_url!,
          identifier: first.skin_identifier
        })
      },
      onReject: (_, e) => logError(e)
    }).pipe(
      withDataAtom(null, (_, data) => isEmptyArray(data) ? null : data),
      withStatusesAtom(),
    ),
    updateSkinAndHead: action((ctx) => {
      if (ENVIRONMENT === 'server') return;

      const nickname = ctx.get(playerState.nickname);
      if (!nickname) return;

      spawn(ctx, (sCtx) => skins.fetch(sCtx, nickname));
    }),
    init: action((ctx) => {
      if (ENVIRONMENT === 'server') return;

      const nickname = ctx.get(playerState.nickname)
      if (!nickname) return;

      const isHardwareAccEnabled = ctx.get(appState.inited.hardwaveIsEnabled)
      if (!isHardwareAccEnabled) return;

      skinsState.selected.reset(ctx);

      spawn(ctx, (sCtx) => skins.fetch(sCtx, nickname));
    }, `${name}.init`)
  }))
)

playerState.nickname.onChange((ctx, state) => state && skins.init(ctx))
skinsState.control.file.onChange((ctx, state) => state && skins.control.setupSkinData(ctx))

export const skinModel = () => ({
  skin,
  SKIN_VARIANTS,
  skinsState,
  skins,
  getIsUploadAvailableAtom,
  skinSubmitIsDisabledAtom,
  getSkinVariantIsActiveAtom,
  getIsSelectSkinAtom
})