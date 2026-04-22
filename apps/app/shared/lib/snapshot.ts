import { Ctx } from "@reatom/core";
import { PageContext } from "vike/types";
import { devLog } from "./log";
import { snapshotAtom } from "./reatom-helpers";

export function mergeSnapshot(reatomCtx: Ctx, pageContext: PageContext) {
  const prevSnap = pageContext.snapshot;
  const updatedSnap = reatomCtx.get(snapshotAtom)
  const newSnap = { ...prevSnap, ...updatedSnap }
  
  // devLog(prevSnap)
  // devLog(updatedSnap)
  devLog(newSnap)

  return newSnap
}