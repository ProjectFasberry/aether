import { type Atom, type CtxSpy, isAtom, type Unsubscribe } from "@reatom/framework";
import { isDeepEqual } from "@reatom/framework";
import { logger } from "./logger";
import { ENVIRONMENT } from "../consts";
import { env } from "../env";

export const createWsUrl = (config: {
  host: string;
  port?: number | string;
  path?: string;
  isSecure?: boolean;
}): string => {
  const { host, port, path = '', isSecure = true } = config;
  const protocol = isSecure ? 'wss' : 'ws';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const portSuffix = port ? `:${port}` : '';
  const cleanHost = host.replace(/\/+$/, '');
  return `${protocol}://${cleanHost}${portSuffix}${cleanPath}`;
};

export function detectMobile(): boolean {
  const nav = navigator as any;

  if (nav.userAgentData?.mobile !== undefined) {
    return nav.userAgentData.mobile;
  }

  const ua = nav.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isIPadOS = ua.includes("macintosh") && nav.maxTouchPoints > 1;

  if (isMobileUA || isIPadOS) {
    try {
      const canvas = document.createElement("canvas");
      const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext;
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");

        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();

          const isDesktopGPU = /nvidia|intel|amd|swiftshader|microsoft/i.test(renderer);
          if (isDesktopGPU) return false;
        }
      }
    } catch (e) { }

    return true;
  }

  return nav.maxTouchPoints > 0 && !/win32|macintel/i.test(nav.platform || "");
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

export function detectHardwareAcceleration(): boolean {
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

    const atom = data as Atom & { [key: string]: unknown };
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
export const wrapTitle = (i: string) => `Fasberry > ${i}`;

export const createEs = (path: string, init: EventSourceInit) => new EventSource(`${env.VITE_API_URL}/${path}`, init)

export function downloadFile(content: BlobPart, fileName: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;

  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}
