import '@bprogress/core/css';
import "@/shared/styles/tailwind.css";
import "@/shared/styles/editor.css"

import type { PropsWithChildren } from 'react'
import { Navigation } from '@/shared/components/app/layout/components/header';
import { WrapperChild } from '@/shared/components/app/layout/components/wrapper';

export default function Wrapper({ children }: PropsWithChildren) {
  return (
    <WrapperChild>
      <Navigation />
      {children}
    </WrapperChild>
  );
}
