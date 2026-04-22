import { atom, Atom, AtomState } from '@reatom/core';
import { createMemStorage, reatomPersist } from '@reatom/persist'

export const ssrStorage = createMemStorage({ 
  name: 'ssr', 
  subscribe: true 
})

export const { snapshotAtom } = ssrStorage;

export const withSsr = reatomPersist(ssrStorage)

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