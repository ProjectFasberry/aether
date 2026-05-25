import '@bprogress/core/css';
import "@/shared/styles/tailwind.css";

import { Header } from "@/shared/components/app/layout/components/header";
import { WrapperChild } from "@/shared/components/app/layout/components/wrapper";
import { type ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <WrapperChild>
      <Header asCompact={true} />
      <div id="page-content" className="min-h-dvh py-6 lg:py-8">
        {children}
      </div>
    </WrapperChild>
  )
}