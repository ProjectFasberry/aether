import { PageContext, PageContextServer } from "vike/types";
import { localeDefault } from ".";
import { translations } from "./translations";
import { CtxSpy } from "@reatom/framework";
import { localeAtom } from "../models/global.model";
import { usePageContext } from "vike-solid/usePageContext";

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

function getByPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const p of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[p];
  }

  return current;
}

// todo: impl react-intl;

export function translate(pageCtx: PageContext, text: string) {
  const locale = pageCtx.locale;

  const node = getByPath(translations, text);
  if (!node) return text;

  return node[locale] ?? text;
}

export function getServerLocale(pageCtx: PageContextServer) {
  const locale = pageCtx.locale;
  return locale
}

export function getClientLocale(ctx: CtxSpy) {
  return ctx.spy(localeAtom)
}

export const useTranslate = () => {
  const pageCtx = usePageContext()
  const handle = (target: string) => translate(pageCtx, target)
  return { translate: handle }
}
