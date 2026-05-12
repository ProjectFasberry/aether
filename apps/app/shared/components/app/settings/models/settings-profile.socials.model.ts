import { currentUserState } from "@/shared/models/current-user/index.model";
import {
  action, atom, reatomAsync, reatomMap, withAssign,
  withCache, withDataAtom, withReset, withStatusesAtom,
  type Action, type AsyncAction
} from "@reatom/framework";
import { isEmptyArray } from "@/shared/lib/helpers";
import { client } from "@/shared/lib/client-wrapper";
import { toast } from "sonner";
import { getPlayerSocials, type PlayerSocialsPayload } from "../../player/models/socials.model";
import { env } from "@/shared/env";
import { alertDialog } from "@/shared/components/config/alert-dialog.model";

const socialStatusAtom = reatomMap<string, boolean>()

export const getSocialStatusAtom = (type: string) => atom((ctx) => ctx.spy(socialStatusAtom).get(type) ?? false)

type SocialAvailablePayload = {
  title: string, social: PlayerSocialsPayload["type"]
}
type SocialsAddPayload = ExtractApiData<"postServerSocialsAdd">;

export const socialsState = atom(null, "socialsState").pipe(
  withAssign((_, name) => ({
    isOpen: atom(false, `${name}.isOpen`),
    isProcessing: atom(false, `${name}.isProcessing`),
    processingSocial: atom<Nullable<string>>(null, `${name}.processingSocial`).pipe(withReset()),
    warningIsConfirmed: atom(false, `${name}.warningIsConfirmed`).pipe(withReset()),
    payload: atom<Nullable<SocialsAddPayload>>(null, `${name}.payload`).pipe(withReset())
  }))
)

type SocialsPayload = | SocialsAddPayload | undefined;

type SocialAction<T> = Action<[social: string], T> | AsyncAction<[social: string], T>;

interface SocialEventConfig<T> {
  as: "dialog" | "link";
  cb: () => SocialAction<T>;
}

const SOCIALS_EVENTS: Record<string, SocialEventConfig<SocialsPayload>> = {
  "discord": {
    as: "link",
    cb: () => action((ctx, social): undefined => {
      window.open(`${env.VITE_API_URL}/server/socials/add/${social}`);
    }),
  },
  telegram: {
    as: "dialog",
    cb: () => socials.control.add as any
  }
};

export const socialsIsProcessingAtom = (v: string) => atom((ctx) => {
  return ctx.spy(socialsState.processingSocial) === v && ctx.spy(socialsState.isProcessing)
})

export const socials = atom(null, "socials").pipe(
  withAssign((_, name) => ({
    onClose: action((ctx) => {
      const isProcessing = ctx.get(socialsState.isProcessing);
      if (isProcessing) return;

      socialsState.warningIsConfirmed.reset(ctx)
    }, `${name}.onClose`),
    fetchList: reatomAsync(async (ctx) => {
      const currentUser = ctx.get(currentUserState);
      if (!currentUser) return [];

      return await ctx.schedule(() =>
        getPlayerSocials(currentUser.nickname, { signal: ctx.controller.signal })
      );
    }, {
      name: `${name}.fetchList`
    }).pipe(
      withDataAtom([]),
      withCache({ swr: false }),
      withStatusesAtom()
    ),
    fetchAvailable: reatomAsync(async (ctx) => {
      return await ctx.schedule(() => client
        .get<SocialAvailablePayload[]>("server/socials/available", {
          signal: ctx.controller.signal
        })
        .exec()
      )
    }, {
      name: `${name}.fetchAvailable`
    }).pipe(
      withDataAtom([], (_, data) => isEmptyArray(data) ? null : data),
      withCache({ swr: false }),
      withStatusesAtom()
    ),
    control: atom(null, `${name}`).pipe(
      withAssign((_, name) => ({
        addWrapper: reatomAsync(async (ctx, social: string) => {
          const event = SOCIALS_EVENTS[social]
          if (!event) return;

          const processingSocial = ctx.get(socialsState.processingSocial)
          const isProcessing = ctx.get(socialsState.isProcessing);

          if (isProcessing && processingSocial !== social) {
            return;
          }

          if (event.as === 'dialog') {
            if (isProcessing) {
              socialsState.isOpen(ctx, true);
              return;
            }

            const warningIsConfirmed = ctx.get(socialsState.warningIsConfirmed);

            if (!warningIsConfirmed) {
              alertDialog.open(ctx, {
                title: "После нажатия вас перекинет на коннект дискорда",
                confirmAction: action((ctx) => {
                  socialsState.warningIsConfirmed(ctx, true);
                  socials.control.addWrapper(ctx, social);
                }),
                confirmLabel: "Перейти"
              })

              return;
            } else {
              socialsState.isOpen(ctx, true);
              socialsState.isProcessing(ctx, true);
              socialsState.processingSocial(ctx, social);

              return await event.cb()(ctx, social)
            }
          }
        }, {
          name: `${name}.addWrapper`,
          onFulfill: (ctx, res) => {
            if (!res) return;

            socialsState.payload(ctx, res);
          },
        }).pipe(
          withStatusesAtom()
        ),
        add: reatomAsync(async (ctx, social: string) => {
          const result = await client
            .post<SocialsAddPayload>("server/socials/add", { json: { social } })
            .exec()

          return { result, social }
        }, `${name}.add`),
        removeWrapper: reatomAsync(async (ctx, type: PlayerSocialsPayload["type"]) => {
          socialStatusAtom.getOrCreate(ctx, type, () => true)

          const remove = reatomAsync(async (ctx, type: PlayerSocialsPayload["type"]) => {
            const result = await ctx.schedule(() =>
              client.delete<{ type: PlayerSocialsPayload["type"] }>(`server/socials/${type}`).exec()
            )

            return { result, type }
          }, {
            name: `${name}.remove`,
            onFulfill: (ctx, res) => {
              socials.fetchList.cacheAtom.reset(ctx)
              socials.fetchList.dataAtom(ctx, (state) => state.filter(t => t.type !== res.type))
            },
            onReject: (ctx, e) => {
              toast.error("Не удалось удалить социальную сеть.")
            }
          })

          try {
            const result = await remove(ctx, type)
            return { result, type }
          } catch (e) {
            return { type }
          }
        }, {
          name: `${name}.removeWrapper`,
          onFulfill: (ctx, { type, result }) => {
            if (!result) {
              socialStatusAtom.delete(ctx, type)
              return;
            }

            if (result.type === type) {
              socialStatusAtom.delete(ctx, type)
            }
          }
        }).pipe(
          withStatusesAtom()
        ),
      }))
    )
  }))
)

socialsState.isOpen.onChange((ctx, state) => !state && socials.onClose(ctx))