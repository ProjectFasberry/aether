import { client } from "../lib/client-wrapper"
import { action, atom, AtomMut } from "@reatom/framework";
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

type Compute<T> = { [K in keyof T]: T[K] } & {};
type Optional<T, K extends keyof T> = Compute<Omit<T, K> & Partial<Pick<T, K>>>;

type SSRModelParams = Optional<Parameters<typeof createMemStorage>[0], "name">

export const ssrSnapshots = new Map<string, AtomMut<PageContext["snapshot"]>>(new Map())

export const ssrModel = ({ name, ...opts }: SSRModelParams) => {
  const modelName = `${name ?? Date.now()}.ssrModel`;

  const ssrStorage = createMemStorage({ ...opts, name: modelName })
  const { snapshotAtom } = ssrStorage;

  if (import.meta.env.DEV) {
    snapshotAtom.onChange((_, s) =>
      console.log(ENVIRONMENT, snapshotAtom.__reatom.name, s)
    );
  }

  const withSsr = reatomPersist(ssrStorage)

  ssrSnapshots.set(modelName, snapshotAtom)

  return {
    snapshotAtom,
    withSsr
  }
}