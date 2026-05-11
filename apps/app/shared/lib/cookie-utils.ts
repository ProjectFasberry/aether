import type { PageContextServer } from "vike/types";

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
): string {
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

  const resultCookie = document.cookie.split('; ');
  const target = resultCookie.find(row => row.startsWith(`${name}=`))!;

  return target.split('=')[1]
}

export function getCookieServer(key: string, { headers }: Pick<PageContextServer, "headers">): Nullable<string> {
  if (!headers) {
    console.warn("Headers is not defined")
    return null;
  }

  const cookies = headers["cookie"].split("; ")
  const target = cookies.find(row => row.startsWith(`${key}=`));

  return target?.split("=")[1] ?? null
}

export function getCookieClient(key: string): Nullable<string> {
  const cookies: string[] = document.cookie.split('; ')
  const target = cookies.find(row => row.startsWith(`${key}=`));

  if (!target) {
    return null;
  }

  return target.split('=')[1]
}

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
