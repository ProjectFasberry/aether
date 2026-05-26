import { atom, withAssign } from "@reatom/framework"
import { PageContext } from "vike/types"
import { Locale } from "../locales"

export const pageState = atom(null, "pageState").pipe(
  withAssign((_, name) => ({
    isClient: atom(false, `${name}.isClient`),
    urlParsed: atom<PageContext["urlParsed"] | null>(null, `${name}.urlParsed`)
  }))
)

export const localeAtom = atom<Locale>("ru", "locale")
