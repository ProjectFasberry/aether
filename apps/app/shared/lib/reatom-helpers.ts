import { Action, atom, Atom, AtomState } from '@reatom/framework';
import { ssrModel } from '../models/shared.model';
import { devtoolsData } from '../models/devtools/state.model';
import { ENVIRONMENT } from '../consts';

export const { snapshotAtom, withSsr } = ssrModel({
  name: "default", subscribe: true, mutable: true
});

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

        console.log(`Action called: ${name}`, result);
      })
    }

    return target;
  };
}