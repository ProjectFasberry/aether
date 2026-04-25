import { PageContextServer } from "vike/types";
import { APP_OPTIONS_KEY, AppOptionsPayloadExtend } from "../models/app.model";
import { Atom, CtxSpy } from "@reatom/core";
import { isDeepEqual } from "@reatom/framework";

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

export function getIsAuth(snapshot: PageContextServer["snapshot"]) {
  const actualSnapshot = snapshot[APP_OPTIONS_KEY].data as AppOptionsPayloadExtend;
  const isAuth = actualSnapshot.isAuth
  return isAuth
}

export function parseCookie(header?: string): Record<string, string> {
  if (!header) return {};

  return header
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

export function setCookie(
  name: string,
  value: string,
  options: {
    maxAgeMs?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  } = {
    sameSite: "Lax",
    path: "/"
  }
) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

  if (options.maxAgeMs) {
    const expires = new Date(Date.now() + options.maxAgeMs);
    parts.push(`Expires=${expires.toUTCString()}`);
  }

  if (options.path) parts.push(`Path=${options.path}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.secure) parts.push(`Secure`);
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);

  document.cookie = parts.join('; ');
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

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
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