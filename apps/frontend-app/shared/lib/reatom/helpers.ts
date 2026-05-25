import { type Action, atom, type Atom, type AtomState, createCtx, type Ctx } from '@reatom/framework';
import { useRef } from 'react';
import { LOGGING } from '../../models/devtools/debug';
import { loggerWithEnv } from '../log';
import { ENVIRONMENT } from '@/shared/consts';

export function withHistory<T extends Atom>(length = 2): (target: T) => T & {
  history: Atom<[current: AtomState<T>, ...past: Array<AtomState<T>>]>
} {
  return (target) =>
    Object.assign(target, {
      history: atom(
        (ctx, state = []) =>
          [ctx.spy(target), ...state.slice(0, length)] as [
            current: AtomState<T>,
            ...past: Array<AtomState<T>>,
          ],
      ),
    })
}

export function withLog<T extends Action>({ withParams = true } = {}): (target: T) => T {
  return (target) => {
    if (LOGGING.actions) {
      target.onCall((_, __, params) => {
        const name = target.__reatom.name || 'anonymous action';
        const result: { 
          // cause: typeof ctx.cause, 
          params?: typeof params, 
        } = { 
          // cause: ctx.cause 
        };

        if (withParams) {
          result.params = params;
        }

        const showResult = ENVIRONMENT === 'client' && Object.keys(result).length

        loggerWithEnv.log(`Action called: ${name}`, ...(showResult ? [result] : []));
      })
    }

    return target;
  };
}

interface Fn<Args extends any[] = any[], Return = any> {
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