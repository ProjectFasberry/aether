import { usePageContext } from "vike-react/usePageContext";
import type { PLAYER_RATE_DATA_KEY, PLAYER_TAGS_DATA_KEY, PlayerRatePayload, PlayerTagsPayload } from "@/shared/components/app/player/models/player.model";
import type { CURRENT_USER_KEY, MePayload } from "../current-user/index.model";
import { appState, type APP_DICTIONARIES_KEY, type APP_OPTIONS_KEY, type AppDictionaries, type AppOptionsPayloadExtend } from "./index.model";
import type { CtxSpy, Ctx } from "@reatom/framework";

type KeysData = {
  [APP_OPTIONS_KEY]: AppOptionsPayloadExtend,
  [APP_DICTIONARIES_KEY]: AppDictionaries,
  [CURRENT_USER_KEY]: MePayload,
  [PLAYER_RATE_DATA_KEY]: PlayerRatePayload,
  [PLAYER_TAGS_DATA_KEY]: PlayerTagsPayload
}

export function getDataFromSnapshot<T extends keyof KeysData>(key: T, snapshot?: Snapshot): Nullable<KeysData[T]> {
  const targetSnapshot = snapshot ?? usePageContext().snapshot
  if (!targetSnapshot) return null;

  const dataByKey = targetSnapshot[key]
  if (!dataByKey) return null;

  if ("data" in dataByKey) {
    return dataByKey.data as KeysData[T]
  }

  return null;
}

/** For server side, when reatom ctx is not accesible */
export function getIsAuthed(snapshot?: Snapshot): boolean {
  const snap = snapshot ?? usePageContext().snapshot;
  const isAuthed = getDataFromSnapshot("appState.options", snap)?.flags.isAuthed;
  return isAuthed ?? false;
}

/** @constructor
* @param {AppOptionsPayloadExtend} parentKey - is parent key
* @param {AppOptionsPayloadExtend[K]} nestedKey - is nested key
* @param {string} nestedKey2 - is nested key
* @param {unknown} defaultValue - fallback value
*/
export function spyOptionAtom<
	K extends keyof AppOptionsPayloadExtend,
	S extends keyof AppOptionsPayloadExtend[K]
>(
	ctx: CtxSpy | Ctx, key: K, subKey: S, defaultVal: AppOptionsPayloadExtend[K][S]
): AppOptionsPayloadExtend[K][S] {
	const map = ctx.spy ? ctx.spy(appState.options) : ctx.get(appState.options);
	return map?.[key]?.[subKey] ?? defaultVal;
}

export function getFromDictionary(ctx: Ctx, key: string): string {
	return ctx.get(appState.dict)?.[key] ?? key;
}

