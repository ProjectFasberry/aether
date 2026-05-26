import { currentUserState } from "@/shared/models/current-user/index.model";
import {
  action, atom, reatomAsync, reatomMap, spawn, withAssign,
  withCache, withDataAtom, withReset, withStatusesAtom,
  type Action, type AsyncAction
} from "@reatom/framework";
import { isEmptyArray } from "@/shared/lib/helpers";
import { client } from "@/shared/lib/client-wrapper";
import { toast } from "sonner";
import { env } from "@/shared/env";
import { alertDialog } from "@/shared/components/config/alert-dialog/alert-dialog.model";

const connectionsStatusAtom = reatomMap<string, boolean>()

const getConnectionStatusAtom = (type: string) => atom((ctx) => ctx.spy(connectionsStatusAtom).get(type) ?? false)

export type ConnectionsAvailablePayload = ExtractApiData<"getServerSocialsAvailable">["data"]
type ConnectionAddPayload = ExtractApiData<"postServerSocialsAdd">;
type ConnectionsPayload = | ConnectionAddPayload | undefined;
type ConnectionAction<T> = Action<[social: string], T> | AsyncAction<[social: string], T>;

interface ConnectionEventConfig<T> {
  as: "dialog" | "link";
  cb: () => ConnectionAction<T>;
}

const CONNECTIONS_EVENTS: Record<string, ConnectionEventConfig<ConnectionsPayload>> = {
  "discord": {
    as: "link",
    cb: () => action((ctx, social): undefined => {
      window.open(`${env.VITE_API_URL}/server/socials/add/${social}`);
    }),
  },
  telegram: {
    as: "dialog",
    cb: () => connectionsControl.add as any
  }
};

const connectionsState = atom(null, "connectionsState").pipe(
  withAssign((_, name) => ({
    isOpen: atom(false, `${name}.isOpen`),
    isProcessing: atom(false, `${name}.isProcessing`),
    processingSocial: atom<Nullable<string>>(null, `${name}.processingSocial`).pipe(withReset()),
    warningIsConfirmed: atom(false, `${name}.warningIsConfirmed`).pipe(withReset()),
    payload: atom<Nullable<ConnectionAddPayload>>(null, `${name}.payload`).pipe(withReset())
  }))
)

const connectionIsProcessingAtom = (social: string) => atom((ctx) =>
  (ctx.spy(connectionsState.processingSocial) === social) && ctx.spy(connectionsState.isProcessing)
)

const connectionsControl = atom(null, "connectionsControl").pipe(
  withAssign((_, name) => ({
    addWrapper: reatomAsync(async (ctx, social: string) => {
      const event = CONNECTIONS_EVENTS[social]
      if (!event) return;

      const processingSocial = ctx.get(connectionsState.processingSocial)
      const isProcessing = ctx.get(connectionsState.isProcessing);

      if (isProcessing && processingSocial !== social) {
        return;
      }

      if (event.as === 'link') {
        const warningIsConfirmed = ctx.get(connectionsState.warningIsConfirmed);

        if (!warningIsConfirmed) {
          alertDialog.open(ctx, {
            title: "После нажатия вас перекинет на коннект дискорда",
            confirmAction: action((ctx) => {
              connectionsState.warningIsConfirmed(ctx, true);
              connectionsControl.addWrapper(ctx, social);
            }),
            confirmLabel: "Перейти"
          })
        }

        return
      }

      if (event.as === 'dialog') {
        if (isProcessing) {
          connectionsState.isOpen(ctx, true);
          return;
        }

        const warningIsConfirmed = ctx.get(connectionsState.warningIsConfirmed);

        if (!warningIsConfirmed) {
          alertDialog.open(ctx, {
            title: "Продолжить?",
            confirmAction: action((ctx) => {
              connectionsState.warningIsConfirmed(ctx, true);
              connectionsControl.addWrapper(ctx, social);
            }),
            confirmLabel: "Перейти"
          })

          return;
        } else {
          connectionsState.isOpen(ctx, true);
          connectionsState.isProcessing(ctx, true);
          connectionsState.processingSocial(ctx, social);

          return await event.cb()(ctx, social)
        }
      }
    }, {
      name: `${name}.addWrapper`,
      onFulfill: (ctx, res) => {
        if (!res) return;

        connectionsState.payload(ctx, res);
      },
    }).pipe(
      withStatusesAtom()
    ),
    add: reatomAsync(async (ctx, social: string) => {
      const result = await client
        .post<ConnectionAddPayload>("server/socials/add", { json: { social } })
        .exec()

      return { result, social }
    }, `${name}.add`),
    removeBefore: reatomAsync(async (ctx, type: string) => {
      connectionsStatusAtom.getOrCreate(ctx, type, () => true)

      const removeSubmit = reatomAsync(async (ctx, type: string) => {
        const result = await ctx.schedule(() =>
          client.delete<{ type: string }>(`server/socials/${type}`).exec()
        )

        return { result, type }
      }, {
        name: `${name}.removeSubmit`,
        onFulfill: (ctx, res) => {
          connections.fetchList.cacheAtom.reset(ctx)
          connections.fetchList.dataAtom(ctx, (state) => state.filter(t => t.social !== res.type))
        },
        onReject: (ctx, e) => {
          toast.error("Не удалось удалить социальную сеть.")
        }
      })

      try {
        const result = await removeSubmit(ctx, type)
        return { result, type }
      } catch (e) {
        return { type }
      }
    }, {
      name: `${name}.removeBefore`,
      onFulfill: (ctx, { type, result }) => {
        if (!result) {
          connectionsStatusAtom.delete(ctx, type)
          return;
        }

        if (result.type === type) {
          connectionsStatusAtom.delete(ctx, type)
        }

        spawn(ctx, (spawnCtx) => {
          connections.fetchAvailable.cacheAtom.reset(spawnCtx)
          connections.fetchAvailable(spawnCtx)
        })
      }
    }).pipe(
      withStatusesAtom()
    ),
    onClose: action((ctx) => {
      const isProcessing = ctx.get(connectionsState.isProcessing);
      if (isProcessing) return;

      connectionsState.warningIsConfirmed.reset(ctx)
    }, `${name}.onClose`),
  }))
)

const connections = atom(null, "connections").pipe(
  withAssign((_, name) => ({
    fetchList: reatomAsync(async (ctx) => {
      const currentUser = ctx.get(currentUserState);
      if (!currentUser) return [];

      return await ctx.schedule(() =>
        client
          .get<ExtractApiData<"getServerSocialsListByNickname">["data"]>(`server/socials/list/${currentUser.nickname}`, {
            searchParams: { variant: "private" },
            signal: ctx.controller.signal
          })
          .exec()
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
        .get<ConnectionsAvailablePayload>("server/socials/available", {
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
  }))
)

connectionsState.isOpen.onChange((ctx, state) => !state && connectionsControl.onClose(ctx))

export const connectionsModel = () => {
  return {
    connectionsControl,
    connections,
    connectionIsProcessingAtom,
    getConnectionStatusAtom,
    connectionsState
  }
}
