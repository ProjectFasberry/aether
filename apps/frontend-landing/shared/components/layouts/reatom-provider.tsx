import { snapshotAtom } from '@/shared/models/ssr'
import { connectLogger, createCtx, Ctx } from '@reatom/framework'
import { reatomContext } from '@reatom/npm-react'
import { PropsWithChildren, useRef } from 'react'
import { usePageContext } from 'vike-react/usePageContext'

export interface Fn<Args extends any[] = any[], Return = any> {
  (...a: Args): Return
}

export const useCreateCtx = (extension?: Fn<[Ctx]>) => {
  const ctxRef = useRef(null as null | Ctx)

  if (!ctxRef.current) {
    ctxRef.current = createCtx({ restrictMultipleContexts: false })

    extension?.(ctxRef.current)
  }

  return ctxRef.current
}

export const ReatomProvider = ({ children }: PropsWithChildren) => {
  const snapshot = usePageContext().snapshot
  
  const ctx = useCreateCtx((ctx) => {
    snapshotAtom(ctx, snapshot)

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      connectLogger(ctx)
    }
  })

  return (
    <reatomContext.Provider value={ctx}>
      {children}
    </reatomContext.Provider>
  )
}