import { type PageContext } from "vike/types";
import { localeDefault } from ".";
import { m } from "@/paraglide/messages.js";

export function getUrlWithLocale(pageCtx: PageContext, pathname: string) {
  const locale = pageCtx.locale
  let url;
  if (locale === localeDefault) {
    url = pathname
  } else {
    url = `/${pageCtx.locale}${pathname}`
  }
  return url
}

export const translate = m;