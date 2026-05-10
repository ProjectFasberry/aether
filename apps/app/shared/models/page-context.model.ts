import { atom, withAssign } from "@reatom/framework";
import { PageContextClient } from "vike/types";

export const pageState = atom(null, "pageState").pipe(
  withAssign((_, name) => ({
    data: atom<Nullable<PageContextClient["data"]>>(null, `${name}.data`),
    urlParsed: atom<Nullable<PageContextClient["urlParsed"]>>(null, `${name}.urlParsed`),
    routeParams: atom<PageContextClient["routeParams"]>({}, `${name}.routeParams`),
    urlPathname: atom<PageContextClient["urlPathname"]>("/", `${name}.urlPathname`),
    isClientside: atom<boolean>(false, `${name}.isClientside`)
  }))
)