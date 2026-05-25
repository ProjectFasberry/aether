import { action, atom, type AtomMut, withAssign } from "@reatom/framework";
import type { PageContextServer } from "vike/types";
import { createMemStorage, reatomPersist } from "@reatom/persist";
import { LOGGING } from "./devtools/debug";
import { loggerWithEnv } from "../lib/log";

export const snapshotsMap: Map<string, AtomMut<Snapshot>> = new Map()

export type SnapshotAtom = AtomMut<Snapshot>

type Compute<T> = { [K in keyof T]: T[K] } & {};
type Optional<T, K extends keyof T> = Compute<Omit<T, K> & Partial<Pick<T, K>>>;
type SSRModelParams = Optional<Parameters<typeof createMemStorage>[0], "name">

type CreateSsrModelPayload = {
  snapshotAtom: SnapshotAtom, withSsr: ReturnType<typeof reatomPersist>
}

export const createSsrModel = ({ name, ...opts }: SSRModelParams): CreateSsrModelPayload => {
  const modelName = `${name ?? Date.now()}.ssrModel`;
  const ssrStorage = createMemStorage({ ...opts, name: modelName })
  const { snapshotAtom } = ssrStorage;

  snapshotsMap.set(modelName, snapshotAtom)

  if (LOGGING.snapshots) {
    snapshotAtom.onChange((_, state) => loggerWithEnv.log(snapshotAtom.__reatom.name, state));
  }

  return {
    snapshotAtom,
    withSsr: reatomPersist(ssrStorage)
  }
};

/* Default ssr model: snapshot atom and extension */
export const { snapshotAtom, withSsr } = createSsrModel({
  name: "default", subscribe: true, mutable: true
});
const defaultSnapshotAtom = snapshotAtom;

export const snapshots = atom(null, "snapshots").pipe(
  withAssign((_, name) => ({
    merge: action((ctx, pageCtx: PageContextServer, snapshotAtom?: SnapshotAtom): Snapshot => {
      let name = (snapshotAtom ?? defaultSnapshotAtom).__reatom.name;

      if (name) {
        // name.ssrModel._snapshotAtom -> name.ssrModel
        const second = name.indexOf('.', name.indexOf('.') + 1);
        const end = second === -1 ? name.length : second;
        name = name.substring(0, end);
      } else {
        console.warn(`Snapshot name is not defined`)
        name = "unknown"
      }

      const updSnap = snapshotAtom
        ? ctx.get(snapshotAtom)
        : ctx.get(defaultSnapshotAtom)

      // @ts-expect-error
      return {
        ...pageCtx.snapshot,
        ...updSnap,
        __meta: { name }
      }
    }, `${name}.merge`),
    init: action((ctx, rootSnapshot: Snapshot): void => {
      if (!rootSnapshot) return;

      for (const [key, snapshot] of Array.from(snapshotsMap)) {
        snapshot(ctx, rootSnapshot);
      }
    }, `${name}.init`)
  }))
)
