import { reatomComponent, useUpdate } from '@reatom/npm-react';
import { Toaster } from '@/shared/components/config/toaster';
import { connectLogger, createCtx, Ctx } from '@reatom/framework'
import { reatomContext } from '@reatom/npm-react'
import { lazy, PropsWithChildren, useRef } from 'react'
import { usePageContext } from 'vike-react/usePageContext'
import { Footer } from '@/shared/components/app/layout/components/footer';
import { Button } from "@repo/ui/button";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { app } from '@/shared/models/app.model';
import { snapshotAtom } from '@/shared/lib/reatom-helpers';
import { Widgets } from '@/shared/components/app/widgets/components/widgets';
import { AlertDialog } from '@/shared/components/config/alert-dialog';
import { getIsAuth } from '@/shared/lib/utils';
import { ClientOnly } from 'vike-react/ClientOnly';
import { isClientAtom } from '@/shared/models/page-context.model';

const SettingsDialog = lazy(() => import("@/shared/components/app/settings/components/settings").then(d => ({ default: d.SettingsDialog })))

const Global = reatomComponent(({ ctx }) => {
  const pageCtx = usePageContext()
  const isAuthed = ctx.spy(isClientAtom) ? getIsAuth(pageCtx.snapshot) : false

  return (
    <>
      <ClientOnly>
        <Widgets />
      </ClientOnly>
      <AlertDialog />
      <ClientOnly>
        {isAuthed && <SettingsDialog />}
      </ClientOnly>
    </>
  )
}, "Global")

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

const SyncPageContext = () => {
  const pageCtx = usePageContext()

  useUpdate((ctx) => {
    const un = app.init(ctx, pageCtx)
    return un
  }, [pageCtx])

  return null;
}

const ReatomProvider = ({ children }: PropsWithChildren) => {
  const { snapshot } = usePageContext()

  const ctx = useCreateCtx((ctx) => {
    snapshotAtom(ctx, snapshot)

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      connectLogger(ctx)
    }
  })

  return (
    <reatomContext.Provider value={ctx}>
      <SyncPageContext />
      {children}
    </reatomContext.Provider>
  )
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col gap-2 h-dvh responsive mx-auto w-full items-center justify-center">
      <div className="flex flex-col w-full items-center justify-center">
        <p className="text-lg font-semibold">Произошла ошибка в работе приложения</p>
        <span>Мы уже работаем над исправлением!</span>
      </div>
      <Button
        className="text-lg font-semibold px-4 bg-neutral-50 text-neutral-950"
        onClick={() => resetErrorBoundary()}
      >
        Обновить
      </Button>
      {import.meta.env.DEV && <pre style={{ color: "red" }}>{error.message}</pre>}
    </div>
  );
}

function logError(error: Error, info: React.ErrorInfo) {
  console.error(error)
};

export const WrapperChild = ({ children }: PropsWithChildren) => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logError}
    >
      <ReatomProvider>
        <Toaster />
        <div id="page-container">
          {children}
          <Footer />
        </div>
        <Global />
      </ReatomProvider>
    </ErrorBoundary>
  )
}
