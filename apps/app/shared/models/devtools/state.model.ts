import { PageContextServer } from "vike/types";
import { devtoolsConfig } from "./config";
import { getCookieClient, getCookieServer, setCookie } from "@/shared/lib/cookie-utils";
import { ENVIRONMENT } from "@/shared/consts";

export const DEVTOOLS_DATA_COOKIE_KEY = "devtools-data"
const DEVTOOLS_COORDS_COOKIE_KEY = 'devtools-cookie';

type NestedKeys<T> = T extends { value: any; __meta: any }
  ? never
  : { [K in keyof T & string]: T[K] extends object
    ? `${K}.${NestedKeys<T[K]>}` | K
    : K;
  }[keyof T & string];

export type DevtoolsCookieChildKey = Exclude<
  NestedKeys<typeof devtoolsConfig>,
  "value" | "__meta" | `${string}.value` | `${string}.__meta`
>;
type ServerOpts = Pick<PageContextServer, "headers">

export type DevtoolsCoords = { x: number, y: number };

const DEFAULT_MAXAGE = 30 * 24 * 60 * 60 * 1000;
const createCookieStorage = <T>(key: string, maxAge = DEFAULT_MAXAGE) => ({
  key,
  set(value: T): Nullable<T> {
    try {
      const stringified = JSON.stringify(value);
      const rawStr = setCookie(this.key, stringified, { maxAgeMs: maxAge });

      return rawStr ? JSON.parse(decodeURIComponent(rawStr)) : null;
    } catch (e) {
      console.error(`Error setting cookie [${this.key}]:`, e);
      return null;
    }
  },
  get(): Nullable<T> {
    const rawStr = getCookieClient(this.key);
    if (!rawStr) return null;

    try {
      return JSON.parse(decodeURIComponent(rawStr)) as T;
    } catch (e) {
      console.error(`Error parsing cookie [${this.key}]:`, e);
      return null;
    }
  }
});

export const devtoolsCoords = createCookieStorage<DevtoolsCoords>(DEVTOOLS_COORDS_COOKIE_KEY)

const setDeep = (obj: any, path: string[], value: any): any => {
  const [head, ...tail] = path;
  if (!head) return value;

  const current = (obj && typeof obj === 'object') ? obj[head] : {};
  return {
    ...obj,
    [head]: tail.length > 0 ? setDeep(current, tail, value) : value
  };
};

type CookiePayload = Record<string, unknown>

export const devtoolsData = {
  key: DEVTOOLS_DATA_COOKIE_KEY,
  _parse(opts?: ServerOpts): Record<string, any> {
    let rawStr: string | null;

    if (ENVIRONMENT === 'server') {
      if (!opts) {
        console.warn("Opts is required for server environment");
        return {};
      }
      rawStr = getCookieServer(this.key, opts);
    } else {
      rawStr = getCookieClient(this.key);
    }

    if (!rawStr) return {};

    try {
      return JSON.parse(decodeURIComponent(rawStr));
    } catch (e) {
      console.error("Devtools parse error:", e);
      return {};
    }
  },
  getAll(opts?: ServerOpts): Nullable<CookiePayload> {
    const data = this._parse(opts);
    return Object.keys(data).length > 0 ? data : null;
  },
  get<T>(path: DevtoolsCookieChildKey, opts?: ServerOpts): Nullable<T> {
    const data = this._parse(opts);
    const result = path.split('.').reduce((acc, part) => acc?.[part], data);
    return (result as T) ?? null;
  },
  setAll(value: object): Nullable<CookiePayload> {
    try {
      const stringified = JSON.stringify(value);
      const resultStr = setCookie(this.key, stringified, { maxAgeMs: DEFAULT_MAXAGE });
      return JSON.parse(decodeURIComponent(resultStr));
    } catch (e) {
      return null;
    }
  },
  set(path: DevtoolsCookieChildKey | typeof DEVTOOLS_DATA_COOKIE_KEY, value: any): Nullable<CookiePayload> {
    const currentData = this._parse();
    const newData = setDeep(currentData, path.split('.'), value);
    return this.setAll(newData);
  }
}