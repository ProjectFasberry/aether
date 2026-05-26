import { client } from "@/shared/api/client"
import { wrapClient } from "@/shared/lib/api"
import { isError } from "@/shared/lib/helpers"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework"
import { action, atom, withAssign } from "@reatom/framework"
import { toast } from "solid-sonner"

export const serverIp = atom(null, "serverIp").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() => wrapClient<{ ip: string }>(() => client("shared/server-ip", {
        signal: ctx.controller.signal,
        throwHttpErrors: false
      })))
    }, {
      name: `${name}.fetch`,
      onReject: (_, e) => {
        if (isError(e)) {
          toast.error("Произошла ошибка", {
            description: e.message
          })
        }
      }
    }).pipe(
      withDataAtom(null, (_, data) => data.ip),
      withCache({ swr: false }),
      withStatusesAtom()
    ),
    copyIp: action(async (ctx) => {
      const data = ctx.get(serverIp.fetch.dataAtom)
      if (!data) return;

      await actionCopyboard(data)
      toast.success("IP успешно скопирован!")
    })
  }))
)

export const actionCopyboard = async (ip: string) => navigator.clipboard.writeText(ip)
