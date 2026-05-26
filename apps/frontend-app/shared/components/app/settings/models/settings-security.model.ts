import { isEmptyArray, isError } from "@/shared/lib/helpers";
import { client } from "@/shared/lib/client-wrapper";
import { atom, reatomAsync, withAssign, withCache, withErrorAtom, withStatusesAtom } from "@reatom/framework";
import { action } from "@reatom/framework";
import { alertDialog } from "@/shared/components/config/alert-dialog/alert-dialog.model";
import { toast } from "sonner";

export type SessionPayload = ExtractApiData<"getAuthSessionCurrent">["data"]
export type SesssionsPayload = ExtractApiData<"getAuthSessionList">["data"];

export const sessionsState = atom(null, "sessionsState").pipe(
  withAssign((_, name) => ({
    activeList: atom<SesssionsPayload | null>(null, `${name}.activeList`),
    current: atom<SessionPayload | null>(null, `${name}.current`)
  }))
)

export const sessions = atom(null, "sessions").pipe(
  withAssign((_, name) => ({
    init: action((ctx) => {
      sessions.fetchCurrent(ctx)
    }, `${name}.init`),
    fetchCurrent: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client<SessionPayload>("auth/session/current").exec()
      );
    }, {
      name: `${name}.fetchCurrent`,
      onFulfill: (ctx, res) => {
        sessionsState.current(ctx, res);
        sessions.fetchActive(ctx)
      }
    }).pipe(
      withStatusesAtom(),
      withCache({ swr: false })
    ),
    fetchActive: reatomAsync(async (ctx) => {
      const result = await ctx.schedule(() =>
        client.get<SesssionsPayload>("auth/session/list", { signal: ctx.controller.signal }).exec()
      );

      return result
    }, {
      name: `${name}.fetchActive`,
      onFulfill: (ctx, res) => {
        sessionsState.activeList(ctx, () => {
          if (isEmptyArray(res)) return null;

          const curr = ctx.get(sessionsState.current);
          if (!curr) return res;

          return res.filter(d => d.created_at !== curr.created_at)
        })
      }
    }).pipe(
      withStatusesAtom(),
      withCache({ swr: false }),
    ),
    refetchAll: action((ctx) => {
      sessions.fetchActive.cacheAtom.reset(ctx);
      sessions.fetchCurrent.cacheAtom.reset(ctx);

      sessions.fetchCurrent(ctx)
    }),
    terminateById: reatomAsync(async (ctx, id: string) => {
      return await client
        .delete<ExtractApiData<"deleteAuthSessionById">["data"]>(`auth/session/${id}`)
        .exec()
    }, {
      name: `${name}.terminateById`,
      onFulfill: (ctx) => {
        sessions.refetchAll(ctx)
      },
      onReject: (ctx, e) => {
        if (isError(e)) {
          toast.error("Произошла ошибка", {
            description: e.message
          })

          if (e.message === 'INSUFFICIENT_PERMISSION_BY_TIME') {
            alertDialog.open(ctx, {
              dialogTitle: "Произошла ошибка",
              description: "Ради безопасности, вы не сможете выйти из сессии. Подождите несколько часов и повторите попытку",
              confirmLabel: "Ок",
              withCancel: false
            })
          }
        }
      }
    }).pipe(
      withStatusesAtom(),
      withErrorAtom()
    ),
    beforeTerminateAll: action((ctx) => {
      alertDialog.open(ctx, {
        title: "Вы точно хотите выйти из всех сессий?",
        confirmLabel: "Подтвердить",
        confirmAction: sessions.terminateAll,
        autoClose: true
      })
    }, `${name}.beforeTerminateAll`),
    terminateAll: reatomAsync(async (ctx) => {
      return await client
        .delete<ExtractApiData<"deleteAuthSessionAll">["data"]>(`auth/session/all`)
        .exec()
    }, {
      name: `${name}.terminateAll`,
      onFulfill: (ctx, res) => {
        sessions.refetchAll(ctx)
      },
      onReject: (ctx, e) => {
        if (isError(e)) {
          toast.error("Произошла ошибка", {
            description: e.message
          })

          if (e.message === 'INSUFFICIENT_PERMISSION_BY_TIME') {
            alertDialog.open(ctx, {
              dialogTitle: "Произошла ошибка",
              description: "Ради безопасности, вы не сможете выйти из остальных сессий. Подождите несколько часов и повторите попытку",
              confirmLabel: "Ок",
              withCancel: false
            })
          }
        }
      }
    }).pipe(
      withStatusesAtom(),
      withErrorAtom()
    )
  }))
)
