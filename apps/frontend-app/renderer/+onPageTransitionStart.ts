import { logRouting } from '@/shared/lib/log';
import { BProgress } from '@bprogress/core';
import { type Config } from 'vike/types';

export const onPageTransitionStart: Config["onPageTransitionStart"] = (pageCtx) => {
  if (pageCtx.isBackwardNavigation) return;
  
  logRouting(pageCtx.urlPathname, "onPageTransitionStart");
  BProgress.start()
};