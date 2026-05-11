import { getUrlWithLocale } from "@/shared/locales/helpers"
import { redirect } from "vike/abort"
import { type PageContext } from "vike/types"

export const data = async (pageCtx: PageContext) => {
  const url = getUrlWithLocale(pageCtx, "/private/config")
  throw redirect(url)
}