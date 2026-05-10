import { Action, atom, Atom, AtomState, createCtx, Ctx } from '@reatom/framework';
import { devtoolsData } from '../models/devtools/state.model';
import { ENVIRONMENT } from '../consts';
import { useRef } from 'react';
import { logger } from './logger';

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

export function withLog<T extends Action>(opts?: { withParams?: true, withEnv?: true }): (target: T) => T {
  const log = devtoolsData.get("logging.actions");

  return (target) => {
    if (log) {
      target.onCall((ctx, _, params) => {
        const name = target.__reatom.name || 'anonymous action';
        const result: { cause: typeof ctx.cause, params?: typeof params, environment?: typeof ENVIRONMENT } = { cause: ctx.cause };

        if (opts?.withParams) result.params = params;
        if (opts?.withEnv) result.environment = ENVIRONMENT;

        logger.withTag(ENVIRONMENT).log(`Action called: ${name}`, result);
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