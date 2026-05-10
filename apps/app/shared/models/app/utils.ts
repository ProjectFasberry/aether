import { AppDictionaries, AppOptionsPayloadExtend } from "./base.model";
import { usePageContext } from "vike-react/usePageContext";
import { PlayerRatePayload, PLAYERRATESTATE_DATA_KEY } from "@/shared/components/app/player/models/rate.model";
import { CURRENT_USER_KEY, MePayload } from "../current-user.model";
import { APP_DICTIONARIES_KEY, APP_OPTIONS_KEY } from "./const";

type KeysData = {
  [APP_OPTIONS_KEY]: AppOptionsPayloadExtend,
  [APP_DICTIONARIES_KEY]: AppDictionaries,
  [CURRENT_USER_KEY]: MePayload,
  [PLAYERRATESTATE_DATA_KEY]: PlayerRatePayload
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
export function getIsAuthed(snapshot: Snapshot): boolean {
  const isAuthed = getDataFromSnapshot("appState.options", snapshot)?.flags.isAuthed;
  return isAuthed ?? false;
}

