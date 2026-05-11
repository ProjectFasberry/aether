import { invariant } from "../lib/invariant";
import { type AudioPatch, definePatch } from "@web-kits/audio";
import { action, atom, withAssign } from "@reatom/framework";
import { withLog } from "../lib/reatom/helpers";

let instance: AudioPatch

export const soundPatch = atom(null, "soundPatch").pipe(
  withAssign((_, name) => ({
    get() {
      invariant(instance, "Patch is not defined")
      return instance;
    },
    init: action(async () => {
      const { minimal } = await import("../../.web-kits/index")
      instance = definePatch(minimal._patch);
    }, `${name}.init`).pipe(
      withLog()
    )
  }))
)