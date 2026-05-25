import { atom, withAssign } from "@reatom/framework";
import { type PageContextClient } from "vike/types";
import { withSsr } from "./ssr";

export const pageState = atom(null, "pageState").pipe(
  withAssign((_, name) => ({
    data: atom<Nullable<PageContextClient["data"]>>(null, `${name}.data`),
    urlParsed: atom<Nullable<PageContextClient["urlParsed"]>>(null, `${name}.urlParsed`).pipe(withSsr(`${name}.urlParsed`)),
    routeParams: atom<PageContextClient["routeParams"]>({}, `${name}.routeParams`).pipe(withSsr(`${name}.routeParams`)),
    urlPathname: atom<PageContextClient["urlPathname"]>("/", `${name}.urlPathname`).pipe(withSsr(`${name}.urlPathname`)),
    isClientside: atom<boolean>(false, `${name}.isClientside`)
  }))
)