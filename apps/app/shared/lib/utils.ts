import { Atom, CtxSpy, isAtom, Unsubscribe } from "@reatom/framework";
import { isDeepEqual } from "@reatom/framework";
import { logger } from "./logger";
import { ENVIRONMENT } from "../consts";

type WsConfig = {
  host: string;
  port?: number | string;
  path?: string;
  isSecure?: boolean;
};

export const createWsUrl = (config: WsConfig): string => {
  const { host, port, path = '', isSecure = true } = config;
  const protocol = isSecure ? 'wss' : 'ws';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const portSuffix = port ? `:${port}` : '';
  const cleanHost = host.replace(/\/+$/, '');
  return `${protocol}://${cleanHost}${portSuffix}${cleanPath}`;
};

export const isMobile = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();

  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  if (!isMobileUA) return false;

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (gl) {
      const debugInfo = (gl as any).getExtension("WEBGL_debug_renderer_info");
      // @ts-expect-error
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_ID).toLowerCase();

      const isDesktopGPU = /nvidia|intel|amd|swiftshader|microsoft/i.test(renderer);
      if (isDesktopGPU) return false;
    }
  } catch (e) { }

  const platform = (navigator as any).platform?.toLowerCase() || "";
  if (/win32|macintel/i.test(platform)) return false;

  return true;
};

export function parseCookie(cookieStr?: string): Record<string, string> {
  if (!cookieStr || cookieStr.trim().length === 0) return {};

  return cookieStr
    .split(';')
    .map(v => v.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, pair) => {
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) return acc;

      const key = pair.slice(0, eqIndex).trim();
      const value = pair.slice(eqIndex + 1).trim();

      if (key) acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

export function isEmptyArray(data: unknown): boolean {
  return !Array.isArray(data) || data.length === 0;
}

export function validateNumber(input: string): number | null {
  const num = Number(input);
  return Number.isFinite(num) ? num : null;
};

export function parseBoolean(str: string | undefined | null): boolean {
  return String(str).toLowerCase() === "true";
}

export function makeChangeValidator<T>(
  oldAtom: Atom<T>,
  newAtom: Atom<T>
): (ctx: CtxSpy) => boolean {
  return (ctx: CtxSpy): boolean => {
    const newValue = ctx.spy(newAtom) ?? ""
    const oldValue = ctx.spy(oldAtom)
    const unchanged = isDeepEqual(oldValue, newValue)
    const hasInput =
      typeof newValue === "string" ? newValue.length >= 1 : Boolean(newValue)

    return Boolean(hasInput && !unchanged)
  }
}

export function hardwareAccelerationIsActive(): boolean {
  let gl: WebGLRenderingContext | null = null;
  const canvas = document.createElement('canvas');

  try {
    gl = (
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true }) ||
      canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: true })
    ) as WebGLRenderingContext | null;
  } catch (e) {
    return false;
  }
  if (!gl) {
    try {
      gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    } catch (e) {
      return false;
    }
    if (!gl) return false;
  }

  const debugInfo = gl.getExtension('RENDERER');
  let rendererName = '';

  if (debugInfo) {
    rendererName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gl.getParameter(gl.RENDERER);
  } else {
    rendererName = gl.getParameter(gl.RENDERER);
  }

  rendererName = rendererName.toLowerCase();

  const softwareRenderers = [
    'swiftshader',
    'llvmpipe',
    'software rasterizer',
    'microsoft basic render driver',
    'vmware svga ii',
    'virtualbox graphics adapter'
  ];

  for (const softwareKeyword of softwareRenderers) {
    if (rendererName.includes(softwareKeyword)) {
      if (import.meta.env.DEV) {
        console.warn(`Potential software WebGL renderer detected: ${rendererName}`);
      }
      return false;
    }
  }

  return true;
}

export function getTopCountry(acceptLanguage?: string): string | null {
  if (!acceptLanguage) return null

  let best: { country: string; q: number } | null = null

  for (const part of acceptLanguage.split(',')) {
    const [lang, qRaw] = part.trim().split(';')
    const country = lang.split('-')[1]
    if (!country) continue

    const q = qRaw?.startsWith('q=') ? Number(qRaw.slice(2)) : 1
    if (!best || q > best.q) {
      best = { country, q }
    }
  }

  return best?.country ?? null
}

export const throttle = <T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number,
) => {
  let isWaiting = false;

  return (...args: T) => {
    if (isWaiting) {
      return;
    }

    callback(...args);
    isWaiting = true;

    setTimeout(() => {
      isWaiting = false;
    }, delay);
  };
};

export const isNullish = <T>(value: T | null | undefined): value is null | undefined => {
  return value === null || value === undefined;
};

export const isMap = <K = any, V = any>(val: unknown): val is Map<K, V> => {
  return val instanceof Map;
}

export const hasSameStructure = <T extends object>(pattern: T, target: unknown): target is T => {
  if (
    typeof pattern !== 'object' || pattern === null ||
    typeof target !== 'object' || target === null
  ) {
    return false;
  }

  const patternKeys = Object.keys(pattern) as Array<keyof T>;

  return patternKeys.every((key) => {
    if (!Object.hasOwn(target, key)) return false;

    const valueP = pattern[key];
    const valueT = (target as any)[key];

    if (typeof valueP === 'object' && valueP !== null && !Array.isArray(valueP)) {
      return hasSameStructure(valueP, valueT);
    }

    return true;
  });
}
export function unsubscribe(unsubs: Unsubscribe[]) {
  for (const unsub of unsubs) unsub()
}

type NestedAtom = Atom & { [key: string]: unknown };

export function subOnchange(data: unknown, visited = new Set<unknown>()): Unsubscribe[] {
  if (ENVIRONMENT === 'server') return [];

  const subs: Unsubscribe[] = [];
  
  if (!data || visited.has(data)) return subs;

  if (Array.isArray(data)) {
    for (const item of data) {
      subs.push(...subOnchange(item, visited));
    }
    return subs;
  }

  if (isAtom(data)) {
    visited.add(data);

    const atom = data as NestedAtom;
    const atomName = atom.__reatom.name ?? 'unnamed';

    if ('onChange' in atom && typeof atom.onChange === 'function') {
      const { log } = logger.withTag(atomName)
      log(`Subscribed`);

      const unmemoizedSub = atom.onChange((ctx, state) => {
        log(state);
      });

      subs.push(unmemoizedSub);
    }

    const keys = Object.getOwnPropertyNames(atom);
    for (const key of keys) {
      const property = atom[key];

      if (isAtom(property) || (typeof property === 'object' && property !== null)) {
        subs.push(...subOnchange(property, visited));
      }
    }
  }

  return subs
}