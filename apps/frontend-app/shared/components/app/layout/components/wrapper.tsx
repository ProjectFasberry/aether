import { useUpdate } from '@reatom/npm-react';
import { reatomContext } from '@reatom/npm-react'
import { type PropsWithChildren } from 'react'
import { usePageContext } from 'vike-react/usePageContext'
import { Footer } from '@/shared/components/app/layout/components/footer';
import { app } from '@/shared/models/app/index.model';
import { ErrorBoundaryProvider } from './error-boundary';
import { Global } from './global';
import { useCreateCtx } from '@/shared/lib/reatom/helpers';

const Sync = () => {
  const pageCtx = usePageContext()
  return useUpdate((ctx) => app.sync(ctx, pageCtx), [pageCtx])
}

const AppProvider = ({ children }: PropsWithChildren) => {
  useUpdate((ctx) => app.init(ctx), []);

  return (
    <>
      <div id="page-container">
        {children}
        <Footer />
      </div>
      <Global />
    </>
  )
}

const ReatomProvider = ({ children }: PropsWithChildren) => {
  const pageCtx = usePageContext();
  const ctx = useCreateCtx((ctx) => app.preInit(ctx, pageCtx))
  
  return <reatomContext.Provider value={ctx}>{children}</reatomContext.Provider>
}

export const WrapperChild = ({ children }: PropsWithChildren) => {
  return (
    <ErrorBoundaryProvider>
      <ReatomProvider>
        <Sync />
        <AppProvider>
          {children}
        </AppProvider>
      </ReatomProvider>
    </ErrorBoundaryProvider>
  )
}