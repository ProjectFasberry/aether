import { VOLUME_ENDPOINT } from "../env";

export function getObject(path: string, target: string) {
  return `${VOLUME_ENDPOINT}/${path}/${target}`
}

export function getStaticObject(path: string, target: string) {
  return `${VOLUME_ENDPOINT}/static/${path}/${target}`
}