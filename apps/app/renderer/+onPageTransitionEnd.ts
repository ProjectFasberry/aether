import { BProgress } from '@bprogress/core';
import { PageContextClient } from 'vike/types';

export const onPageTransitionEnd = async (pageCtx: PageContextClient) => {
  if (pageCtx.isBackwardNavigation) {
    return;
  }

  BProgress.done()
};