import { atom } from "@reatom/core"
import { PageContext } from "vike/types"
import { Locale } from "../locales"

export const pageContextAtom = atom<PageContext | null>(null, "pageContext")

export const localeAtom = atom<Locale>("ru", "locale")