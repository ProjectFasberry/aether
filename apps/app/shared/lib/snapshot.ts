import { Ctx } from "@reatom/framework";
import { PageContext } from "vike/types";
import { snapshotAtom as defaultSnapshotAtom } from "./reatom-helpers";
import type { SnapshotAtom } from "../models/shared.model";

export function mergeSnapshot(ctx: Ctx, pageCtx: PageContext, snapshotAtom?: SnapshotAtom): Snapshot {
  let metaName = (snapshotAtom ?? defaultSnapshotAtom).__reatom.name;
  if (!metaName) {
    console.warn(`Snapshot name is not defined`)
  }

  if (metaName) {
    // name.ssrModel._snapshotAtom -> name.ssrModel
    const second = metaName.indexOf('.', metaName.indexOf('.') + 1);
    const end = second === -1 ? metaName.length : second;
    metaName = metaName.substring(0, end); 
  }

  const updSnap = snapshotAtom
    ? ctx.get(snapshotAtom)
    : ctx.get(defaultSnapshotAtom)

  return {
    ...pageCtx.snapshot,
    ...updSnap,
    __meta: {
      name: metaName ?? "unknown"
    }
  }
}