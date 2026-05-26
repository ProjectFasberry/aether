import { BProgress } from '@bprogress/core';
import { PageContextClient } from 'vike/types';

export const onPageTransitionStart = async (pageCtx: Partial<PageContextClient>) => {
  if (!pageCtx.urlPathname?.includes("/wiki")) {
    document.querySelector("body")?.classList.add("page-is-transitioning");
  }

  BProgress.start()
};
