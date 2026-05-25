import { type Atom } from "@reatom/framework";
import { reatomComponent } from "@reatom/npm-react";
import { type ReactNode } from "react";
import { LoaderNode, type LoaderProps } from "./loader";

type WithLoaderProps = { children: ReactNode, loaderAtom: Atom<boolean> } & LoaderProps

export const WithLoader = reatomComponent<WithLoaderProps>(({ ctx, title, subtitle, children, loaderAtom }) => {
  const isVisible = ctx.spy(loaderAtom);

  return (
    <>
      {isVisible && <LoaderNode title={title} subtitle={subtitle} />}
      {children}
    </>
  )
}, "WithLoader")