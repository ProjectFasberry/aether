import { invariant } from "../lib/invariant";
import { type AudioPatch, definePatch, type PlayOptions } from "@web-kits/audio";
import { action, atom, withAssign } from "@reatom/framework";

let instance: AudioPatch

export const sound = atom(null, "sound").pipe(
  withAssign((_, name) => ({
    get() {
      invariant(instance, "Audio patch is not defined")
      return instance;
    },
    init: action(async () => {
      const { minimal } = await import("../../.web-kits/index")
      instance = definePatch(minimal._patch);
    }, `${name}.init`),
    play: action((ctx, playName: string, opts?: PlayOptions | undefined) => {
      sound.get().play(playName, opts);
    })
  }))
)
