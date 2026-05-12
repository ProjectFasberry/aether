import { logRouting } from "@/shared/lib/log"
import { wrapTitle } from "@/shared/lib/utils";
import { useConfig } from "vike-react/useConfig";
import { type PageContext } from "vike/types"

export type Data = Awaited<ReturnType<typeof data>>;

function metadata() {
  return {
    title: wrapTitle('Задания')
  }
}

export async function data(pageCtx: PageContext) {
  logRouting(pageCtx.urlPathname, "data");

  const config = useConfig()
  config(metadata())
}