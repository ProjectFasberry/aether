import { BProgress } from '@bprogress/core';
import { PageContextClient } from 'vike/types';

export const onPageTransitionStart = async (pageCtx: Partial<PageContextClient>) => {
  if (pageCtx.isBackwardNavigation) {
    return;
  }

  BProgress.start()
};