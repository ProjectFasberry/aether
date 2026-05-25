import { type PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="responsive mx-auto min-h-dvh py-8">
      {children}
    </div>
  )
}