import { type Locale, localeDefault, locales } from '@/shared/locales'
import { type PageContext } from 'vike/types'
import { modifyUrl } from 'vike/modifyUrl'

function extractLocale(pathname: string) {
  let locale: Locale = localeDefault
  let pathnameWithoutLocale = pathname

  const path = pathname.split('/')
  const first = path[1]

  if (locales.includes(first as Locale)) {
    if (first !== localeDefault) {
      locale = first as Locale
      pathnameWithoutLocale = '/' + path.slice(2).join('/')
    }
  }

  return { locale, pathnameWithoutLocale }
}

export function onBeforeRoute(pageCtx: PageContext) {
  const { urlParsed } = pageCtx
  const { locale, pathnameWithoutLocale } = extractLocale(urlParsed.pathname)

  return {
    pageContext: {
      locale,
    }
  }
}