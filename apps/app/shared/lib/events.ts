import { Action, Ctx } from "@reatom/core";
import { pageContextAtom } from "../models/page-context.model";

export function startPageEvents(
  ctx: Ctx,
  events: Action,
  opts: { urlTarget?: string, key?: string } = {}
) {
  const pageCtx = ctx.get(pageContextAtom);
  if (!pageCtx) return;

  const key = opts.key ?? opts.urlTarget ?? 'page';

  if (opts.urlTarget) {
    const urlPathname = pageCtx.urlPathname ?? '';
    
    if (!urlPathname.includes(`/${opts.urlTarget}`)) {
      if (import.meta.env.DEV) console.log(`[${key}] Skip: URL not matching target`);
      return;
    }

    if (import.meta.env.DEV) console.log(`[${key}] URL match confirmed`);
  }

  if (import.meta.env.DEV) console.log(`[${key}] Triggering page events`);
  events(ctx);
}

export const listenBackOnce = (cb: () => void) => {
  window.history.pushState({ active: true }, '');

  const handler = () => {
    cb();
    window.removeEventListener('popstate', handler);
  };

  window.addEventListener('popstate', handler);

  return () => {
    window.removeEventListener('popstate', handler);
  };
};