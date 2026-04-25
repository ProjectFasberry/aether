import '@bprogress/core/css';
import "@/shared/styles/tailwind.css";

import { PropsWithChildren } from 'react'
import { Navigation } from '@/shared/components/app/layout/components/header';
import { Widgets } from '@/shared/components/app/widgets/components/widgets';
import { WrapperChild } from '@/shared/components/app/layout/components/wrapper';
import { AlertDialog } from '@/shared/components/config/alert-dialog';
import { SettingsDialog } from '@/shared/components/app/settings/components/settings';

const Global = () => {
  return (
    <>
      <Widgets />
      <AlertDialog />
      <SettingsDialog />
    </>
  )
}

export default function Wrapper({ children }: PropsWithChildren) {
  return (
    <WrapperChild>
      <Navigation />
      {children}
      <Global />
    </WrapperChild>
  );
}
