import { logRouting } from "@/shared/lib/log"
import { wrapTitle } from "@/shared/lib/wrap-title";
import { useConfig } from "vike-react/useConfig";
import { type PageContext } from "vike/types"

export type Data = Awaited<ReturnType<typeof data>>;

function metadata() {
  return {
    title: wrapTitle('Задания')
  }
}

export const data = async (pageCtx: PageContext) => {
  logRouting(pageCtx.urlPathname, data.name);

  const config = useConfig()
  config(metadata())
}