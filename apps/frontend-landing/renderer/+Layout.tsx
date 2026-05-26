import '@bprogress/core/css';
import "@/shared/styles/tailwind.css";
import "@/shared/styles/minecraft.css"

import { Toaster } from "@/shared/components/config/toaster";
import { usePageContext } from "vike-solid/usePageContext";
import { pageState } from '@/shared/models/global.model';
import { Footer } from '@/shared/components/layouts/footer';
import { Header } from '@/shared/components/layouts/header';
import { createEffect, JSXElement, onMount } from 'solid-js';
import { useCtx } from '@reatom/npm-solid-js';
import { snapshotAtom } from '@/shared/models/ssr'
import { action, connectLogger, createCtx, Ctx } from '@reatom/framework'
import { reatomContext } from '@reatom/npm-solid-js'
import { PageContext } from 'vike/types';

interface Fn<Args extends any[] = any[], Return = any> {
  (...a: Args): Return
}

const useCreateCtx = (extension?: Fn<[Ctx]>) => {
  const ctx = createCtx({ restrictMultipleContexts: false });
  extension?.(ctx);
  return ctx;
};

const ReatomProvider = (props: { children: JSXElement }) => {
  const snapshot = usePageContext().snapshot;

  const ctx = useCreateCtx((ctx) => {
    snapshotAtom(ctx, snapshot);

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      connectLogger(ctx);
    }
  });

  return <reatomContext.Provider value={ctx}>{props.children}</reatomContext.Provider>
}

const syncPageState = action((ctx, pageCtx: PageContext) => {
  pageState.urlParsed(ctx, pageCtx.urlParsed)
  pageState.isClient(ctx, !!pageCtx.Page)
}, "syncPageState")

const injectWidgets = action(async () => {
  // todo: add analytics/speed-insights (?)
}, "injectWidgets")

const SyncPageCtx = () => {
  const ctx = useCtx();
  const pageCtx = usePageContext();

  createEffect(() => {
    syncPageState(ctx, pageCtx)
  }, [pageCtx]);

  return null;
}

const LayoutContent = (props: { children: JSXElement }) => {
  const ctx = useCtx();

  onMount(() => {
    injectWidgets(ctx)
  })

  return (
    <>
      <Toaster />
      <Header />
      <SyncPageCtx />
      <div id="page-content">
        {props.children}
      </div>
      <Footer />
    </>
  )
}

export default function LayoutDefault(props: { children: JSXElement }) {
  return (
    <div id="page-container">
      <ReatomProvider>
        <LayoutContent>
          {props.children}
        </LayoutContent>
      </ReatomProvider>
    </div>
  );
}
