import { atom, Atom, AtomState } from '@reatom/framework';
import { ssrModel } from '../models/shared.model';

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