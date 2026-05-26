import { BProgress } from '@bprogress/core';
import { PageContextClient } from 'vike/types';

export const onPageTransitionEnd = async (pageCtx: PageContextClient) => {
  if (!pageCtx.urlPathname?.includes("/wiki")) {
    document.querySelector("body")?.classList.remove("page-is-transitioning");
  }

  BProgress.done()
};
