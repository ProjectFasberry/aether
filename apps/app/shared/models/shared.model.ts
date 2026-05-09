import { client } from "../lib/client-wrapper"
import { action, atom, AtomMut, Ctx } from "@reatom/framework";
import { withAssign, withReset } from "@reatom/framework";
import { createMemStorage, reatomPersist } from "@reatom/persist";
import { ENVIRONMENT } from "../consts";
import { PageContext } from "vike/types";

type ExistNicknamePayload = ExtractApiData<"getValidateNicknameByNickname">["data"]
export async function getExistNickname(nickname: string) {
  return client<ExistNicknamePayload>(`validate/nickname/${nickname}`).exec()
}

export const pof = atom(null, "pof").pipe(
  withAssign((_, name) => ({
    showTokenVerifySectionAtom: atom(false, `${name}.showTokenVerifySection`).pipe(withReset()),
    token: atom<Nullable<string>>(null, `${name}.token`).pipe(withReset()),
    resetAll: action((ctx) => {
      pof.showTokenVerifySectionAtom.reset(ctx)
      pof.token.reset(ctx)
    })
  })),
);

export type SnapshotAtom = AtomMut<Snapshot>

// type SnapshotListener = (name: string, atom: AtomMut<Snapshot>) => void;
// const listeners = new Set<SnapshotListener>();

let clientCtx: Nullable<Ctx> = null;
// let snapshotsInited = false;

export function initClientCtx(ctx: Ctx) {
  clientCtx = ctx;
  // checkAndRunTasks();
}

export const ssrSnapshots = new Map<string, AtomMut<Snapshot>>(new Map())
// const originalSet = ssrSnapshots.set.bind(ssrSnapshots);

// ssrSnapshots.set = (key, value) => {
//   const result = originalSet(key, value);
//   listeners.forEach(cb => { cb(key, value) });
//   return result;
// };

// const pendingTasks: Array<(ctx: Ctx) => void> = [];

// function onSnapshotAdded(cb: SnapshotListener): Unsubscribe {
//   listeners.add(cb);
//   return () => void listeners.delete(cb);
// };

// onSnapshotAdded((_, atom) => {
//   if (!devtoolsData.get<boolean>("logging.snapshot")) return;

//   if (ENVIRONMENT === 'client') {
//     const runTask = (ctx: Ctx) => ctx.subscribe(atom, (state) => {
//       if (Object.keys(state).length === 0) return;
//       console.log(atom.__reatom.name, state)
//     })

//     if (!snapshotsInited || !clientCtx) {
//       pendingTasks.push(runTask);
//       return;
//     }

//     runTask(clientCtx);
//   }
// });

export const initSnapshots = action((ctx, pageCtx: PageContext) => {
  const pageCtxSnapshot = pageCtx.snapshot;
  if (!pageCtxSnapshot || !pageCtxSnapshot?.__meta) return;

  for (const [key, snapshot] of Array.from(ssrSnapshots)) {
    if (pageCtxSnapshot.__meta.name !== key) continue;
    snapshot(ctx, pageCtxSnapshot);
  }

  // snapshotsInited = true;
  // checkAndRunTasks()
})

// function checkAndRunTasks() {
//   if (!clientCtx || !snapshotsInited) return;

//   while (pendingTasks.length > 0) {
//     const task = pendingTasks.shift();
//     if (task) task(clientCtx);
//   }
// }

type Compute<T> = { [K in keyof T]: T[K] } & {};
type Optional<T, K extends keyof T> = Compute<Omit<T, K> & Partial<Pick<T, K>>>;

type SSRModelParams = Optional<Parameters<typeof createMemStorage>[0], "name">

export const ssrModel = ({ name, ...opts }: SSRModelParams): {
  snapshotAtom: SnapshotAtom,
  withSsr: ReturnType<typeof reatomPersist>
} => {
  const modelName = `${name ?? Date.now()}.ssrModel`;
  const ssrStorage = createMemStorage({ ...opts, name: modelName })
  const snapshotAtom = ssrStorage.snapshotAtom as SnapshotAtom;

  snapshotAtom.onChange((_, state) => {
    if (Object.keys(state).length === 0) return;

    console.log(ENVIRONMENT, snapshotAtom.__reatom.name, state)
  });

  const withSsr = reatomPersist(ssrStorage)
  ssrSnapshots.set(modelName, snapshotAtom)

  return {
    snapshotAtom,
    withSsr
  }
}