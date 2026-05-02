import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async";
import { action, atom, batch } from "@reatom/core";
import { sleep, withAssign, withInit, withReset } from "@reatom/framework";
import { logError } from "@/shared/lib/log";
import { client } from "@/shared/lib/client-wrapper";
import { isIdentityAtom, playerParamAtom } from "./player.model";
import { toast } from "sonner";
import { DIALOG_DELAY } from "@/shared/consts";
import { FlyingAnimation, IdleAnimation, RunningAnimation, SkinViewer } from "skinview3d";
import { IconButterfly, TablerIcon } from "@tabler/icons-react";
import { IconRun } from "@tabler/icons-react";
import { IconManFilled } from "@tabler/icons-react";
import { hardwareAccelerationIsActive } from "@/shared/lib/utils";
import { SkinsHistory } from "../components/skin";

type SkinAnimationType = "idle" | "run" | "flying";
type SkinAnimation = typeof FlyingAnimation | typeof IdleAnimation | typeof RunningAnimation
type SkinControls = { animation: SkinAnimationType; icon: TablerIcon };

export const SKIN_ANIMATIONS: SkinControls[] = [
  { animation: "idle", icon: IconManFilled },
  { animation: "run", icon: IconRun, },
  { animation: "flying", icon: IconButterfly },
];

export const skinAnimation = atom(null, "skinAnimation").pipe(
  withAssign((_, name) => ({
    type: atom<SkinAnimationType>("idle", `${name}.type`),
    isRotate: atom<boolean>(false, "skinRotating"),
    viewer: atom<SkinViewer | null>(null, "skinViewer")
  }))
)

const animationClasses: Record<SkinAnimationType, SkinAnimation> = {
  idle: IdleAnimation,
  run: RunningAnimation,
  flying: FlyingAnimation,
};

skinAnimation.isRotate.onChange((ctx, state) => {
  let viewer = ctx.get(skinAnimation.viewer)
  if (!viewer) return;

  viewer.autoRotate = state
  skinAnimation.viewer(ctx, viewer)
})

skinAnimation.type.onChange((ctx, state) => {
  let viewer = ctx.get(skinAnimation.viewer)
  if (!viewer) return;

  viewer.animation = new animationClasses[state]();
  skinAnimation.viewer(ctx, viewer)
})

type SkinSelected = {
  skin_head_url: string | null,
  skin_url: string | null,
  identifier: string
}

const SKIN_VARIANTS = ["classic", "slim"] as const

export const skinsState = atom(null, "skinsState").pipe(
  withAssign((_, name) => ({
    selected: atom<SkinSelected | null>(null, `${name}.selected`).pipe(withReset()),
    control: atom(null, `${name}.state`).pipe(
      withAssign((_, name) => ({
        dialogIsOpen: atom(false, `${name}.dialogIsOpen`).pipe(withReset()),
        file: atom<File | null>(null, `${name}.file`).pipe(
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
        fileData: atom<SkinFileData | null>(null, `${name}.fileData`).pipe(withReset()),
        variant: atom<SkinVariant>("classic", `${name}.variant`).pipe(withReset()),
        SKIN_VARIANTS
      }))
    )
  }))
)

export const hardwareAccIsEnabledAtom = atom(false, "hardwareAccIsEnabled").pipe(
  withInit(() => hardwareAccelerationIsActive())
)

export const skins = atom(null, "skins").pipe(
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
            client<"success" | "error">("server/skin/set", { searchParams: { id }, retry: 1 }).exec()
          )
        }, {
          name: `${name}.set`,
          onFulfill: (ctx, res) => {
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

          await ctx.schedule(() => sleep(2000));

          return { result }
        }, {
          name: `${name}.change`,
          onFulfill: async (ctx, res) => {
            toast.success("Скин обновлен", { description: "Если вы в игре - перезайдите" })

            skins.updateSkinAndHead(ctx)
            skinsState.control.dialogIsOpen.reset(ctx)

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
      return await ctx.schedule(() => client<SkinsHistory[]>(`server/skin/history/${nickname}`).exec())
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
      withDataAtom(null, (_, data) => data.length ? data : null),
      withStatusesAtom(),
      withCache({ swr: false })
    ),
    updateSkinAndHead: action((ctx) => {
      const nickname = ctx.get(playerParamAtom);
      if (!nickname) throw new Error("Nickname is not defined");

      batch(ctx, () => {
        skins.fetch.cacheAtom.reset(ctx);
        skins.fetch(ctx, nickname);
      })
    }),
    init: action((ctx, nickname: string) => {
      const isHardwareAccEnabled = ctx.get(hardwareAccIsEnabledAtom)
      if (!isHardwareAccEnabled || !nickname) return;
    
      skins.fetch.cacheAtom.reset(ctx);
      skins.fetch.dataAtom.reset(ctx);
      skinsState.selected.reset(ctx);
    
      skins.fetch(ctx, nickname)
    }, "initSkinAction")
  }))
)

export const getIsUploadAvailableAtom = atom((ctx) => {
  if (!ctx.spy(isIdentityAtom)) return false;
  return true;
})

export type SkinVariant = typeof SKIN_VARIANTS[number]

type SkinFileData = { name: string, size: number, url: string }

export const skinSubmitIsDisabledAtom = atom((ctx) => {
  if (ctx.spy(skins.control.change.statusesAtom).isPending) return true;
  return !ctx.spy(skinsState.control.file);
})

export const getSkinVariantIsActiveAtom = (type: string) => atom((ctx) => ctx.spy(skinsState.control.variant) === type)

skinsState.control.file.onChange((ctx, state) => state && skins.control.setupSkinData(ctx))

export const getIsSelectSkinAtom = atom((ctx) => {
  if (!ctx.spy(isIdentityAtom)) return false;

  const state = ctx.spy(skins.fetch.dataAtom)
  if (!state) return false;

  return state[0].skin_identifier !== ctx.spy(skinsState.selected)?.identifier
})