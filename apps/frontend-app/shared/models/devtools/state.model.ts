import { devtoolsConfig } from "./config";
import { getCookieClient, setCookie } from "@/shared/lib/cookie-utils";
import { isObject } from "@reatom/framework";

const DEVTOOLS_DATA_LS_KEY = "devtools-data"
const DEVTOOLS_COORDS_COOKIE_KEY = 'devtools-coords';

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
export type DevtoolsCoords = { x: number, y: number, w: number, h: number };

const createCookieStorage = <T>(key: string, maxAge = 30 * 24 * 60 * 60 * 1000) => ({
  key,
  set(value: Partial<T>, patch = true): Nullable<T> {
    try {
      let newValue: T;

      if (patch) {
        const current = this.get();

        newValue = (isObject(current) && isObject(value))
          ? { ...current, ...value }
          : value as T;
      } else {
        newValue = value as T;
      }

      const stringified = JSON.stringify(newValue);
      const rawStr = setCookie(this.key, stringified, { maxAgeMs: maxAge, path: "/" });

      return rawStr ? JSON.parse(decodeURIComponent(rawStr)) : null;
    } catch (e) {
      console.error(`Error updating cookie [${this.key}]:`, e);
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

export const devtoolsData = {
  key: DEVTOOLS_DATA_LS_KEY,
  _parse(): Record<string, any> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error("Devtools parse error:", e);
      return {};
    }
  },
  getAll<T>(): T | null {
    const data = this._parse();
    return Object.keys(data).length > 0 ? (data as T) : null;
  },
  get<T>(path: DevtoolsCookieChildKey): T | null {
    const data = this._parse();
    const result = path.split('.').reduce((acc, part) => acc?.[part], data);
    return (result as T) ?? null;
  },
  setAll<T>(value: object): T | null {
    try {
      const stringified = JSON.stringify(value);
      localStorage.setItem(this.key, stringified);
      return JSON.parse(stringified) as T;
    } catch (e) {
      console.error("Devtools save error:", e);
      return null;
    }
  },
  set(path: DevtoolsCookieChildKey, value: any): any {
    if (value instanceof Map) return null;

    const currentData = this._parse();
    const newData = setDeep(currentData, path.split('.'), value);
    return this.setAll(newData);
  },
  clear() {
    localStorage.removeItem(this.key);
  }
};