import { Ctx } from "@reatom/framework";
import { PageContext } from "vike/types";
import { snapshotAtom as defaultSnapshot } from "./reatom-helpers";
import { SnapshotAtom } from "../models/shared.model";

type MergedSnapshot = Snapshot

export function mergeSnapshot(ctx: Ctx, pageCtx: PageContext, snapshot?: SnapshotAtom): MergedSnapshot {
  let metaName = (snapshot ?? defaultSnapshot).__reatom.name;
  if (!metaName) {
    console.warn(`Snapshot name is not defined`)
  }

  if (metaName) {
    // name.ssrModel._snapshotAtom -> name.ssrModel
    const firstDot = metaName.indexOf('.');
    const secondDot = metaName.indexOf('.', firstDot + 1);
    const end = secondDot === -1 ? metaName.length : secondDot;
    metaName = metaName.substring(0, end); 
  }

  const updSnap = snapshot
    ? ctx.get(snapshot)
    : ctx.get(defaultSnapshot)

  return {
    ...pageCtx.snapshot,
    ...updSnap,
    __meta: {
      name: metaName ?? "unknown"
    }
  }
}