import { useUpdate } from '@reatom/npm-react';
import { action, createCtx, Ctx } from '@reatom/framework'
import { reatomContext } from '@reatom/npm-react'
import { PropsWithChildren, useRef } from 'react'
import { usePageContext } from 'vike-react/usePageContext'
import { Footer } from '@/shared/components/app/layout/components/footer';
import { app } from '@/shared/models/app.model';
import { pageCtxAtom } from '@/shared/models/page-context.model';
import { PageContext, PageContextClient } from 'vike/types';
import { connectLogger } from "@reatom/framework"
import { ErrorBoundaryProvider } from './error-boundary';
import { Global } from './global';
import { ssrSnapshots } from '@/shared/models/shared.model';

interface Fn<Args extends any[] = any[], Return = any> {
  (...a: Args): Return
}

const useCreateCtx = (extension?: Fn<[Ctx]>) => {
  const ctxRef = useRef(null as null | Ctx)

  if (!ctxRef.current) {
    ctxRef.current = createCtx({ restrictMultipleContexts: false })
    extension?.(ctxRef.current)
  }

  return ctxRef.current
}

const initSnapshots = action((ctx, pageCtx: PageContext) => {
  const pageCtxSnapshot = pageCtx.snapshot;
  if (!pageCtxSnapshot || !pageCtxSnapshot?.__meta) return;

  for (const [key, snapshot] of Array.from(ssrSnapshots)) {    
    if (pageCtxSnapshot.__meta.name !== key) continue;

    snapshot(ctx, pageCtxSnapshot);

    if (import.meta.env.DEV) {
      console.log(`Snapshot ${key} inited`)
    }
  }
})

const Sync = () => {
  const pageCtx = usePageContext()

  return useUpdate((ctx) => {
    initSnapshots(ctx, pageCtx)
    pageCtxAtom(ctx, pageCtx as PageContextClient)
  }, [pageCtx])
}

const AppProvider = ({ children }: PropsWithChildren) => {
  useUpdate((ctx) => app.init(ctx), []);

  return (
    <>
      <Sync />
      <div id="page-container">
        {children}
        <Footer />
      </div>
      <Global />
    </>
  )
}

const onCreateCtx = action((ctx, pageCtx: PageContext) => {
  initSnapshots(ctx, pageCtx)

  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    connectLogger(ctx)
  }
})

const ReatomProvider = ({ children }: PropsWithChildren) => {
  const pageCtx = usePageContext();
  const ctx = useCreateCtx((ctx) =>onCreateCtx(ctx, pageCtx))

  return <reatomContext.Provider value={ctx}>{children}</reatomContext.Provider>
}

export const WrapperChild = ({ children }: PropsWithChildren) => {
  return (
    <ErrorBoundaryProvider>
      <ReatomProvider>
        <AppProvider>
          {children}
        </AppProvider>
      </ReatomProvider>
    </ErrorBoundaryProvider>
  )
}