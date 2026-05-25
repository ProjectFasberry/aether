import { PageContext, PageContextServer } from "vike/types";
import { localeDefault } from ".";
import { translations } from "./translations";
import { CtxSpy } from "@reatom/core";
import { localeAtom } from "../models/global.model";

export function getUrlWithLocale(pageContext: PageContext, pathname: string) {
  const locale = pageContext.locale
  let url;
  if (locale === localeDefault) {
    url = pathname
  } else {
    url = `/${pageContext.locale}${pathname}`
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

export function translate(pageContext: PageContext, text: string) {
  const locale = pageContext.locale;

  const node = getByPath(translations, text);
  if (!node) return text;

  return node[locale] ?? text;
}

export function getServerLocale(pageContext: PageContextServer) {
  const locale = pageContext.locale;
  return locale
}

export function getClientLocale(ctx: CtxSpy) {
  return ctx.spy(localeAtom)
}