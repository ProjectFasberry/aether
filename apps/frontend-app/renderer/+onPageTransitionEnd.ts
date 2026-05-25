import { logRouting } from '@/shared/lib/log';
import { BProgress } from '@bprogress/core';
import { type Config } from 'vike/types';

export const onPageTransitionEnd: Config["onPageTransitionEnd"] = (pageCtx) => {
  if (pageCtx.isBackwardNavigation) return;
  
  logRouting(pageCtx.urlPathname, "onPageTransitionEnd");
  BProgress.done()
};