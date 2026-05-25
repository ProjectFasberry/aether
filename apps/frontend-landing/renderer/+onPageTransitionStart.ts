import { BProgress } from '@bprogress/core';
import { PageContextClient } from 'vike/types';

export const onPageTransitionStart = async (pageContext: Partial<PageContextClient>) => {
  if (!pageContext.urlPathname?.includes("/wiki")) {
    document.querySelector("body")?.classList.add("page-is-transitioning");
  }
  
  BProgress.start()
};
