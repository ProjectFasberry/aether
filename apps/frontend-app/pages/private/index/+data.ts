import { getUrlWithLocale } from "@/shared/locales/helpers"
import { redirect } from "vike/abort"
import { type PageContext } from "vike/types"

export async function data(pageCtx: PageContext) {
  throw redirect(getUrlWithLocale(pageCtx, "/private/config"))
}