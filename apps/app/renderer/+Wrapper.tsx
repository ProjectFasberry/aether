import '@bprogress/core/css';
import "@/shared/styles/tailwind.css";

import { PropsWithChildren } from 'react'
import { Banner } from '@/shared/components/app/widgets/components/banner';
import { Header } from '@/shared/components/app/layout/components/header';
import { Widgets } from '@/shared/components/app/widgets/components/widgets';
import { WrapperChild } from '@/shared/components/app/layout/components/wrapper';
import { AlertDialog } from '@/shared/components/config/alert-dialog';

export default function Wrapper({ children }: PropsWithChildren) {
  return (
    <WrapperChild>
      <Banner />
      <Header />
      <div id="page-content" className="min-h-dvh py-6 lg:py-8">
        {children}
      </div>
      <Widgets />
      <AlertDialog />
    </WrapperChild>
  );
}
