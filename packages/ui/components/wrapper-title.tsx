import { ReactNode } from "react";

export const WrapperTitle = ({
  children
}: { children: ReactNode }) => {
  return (
    <div className="responsive px-1 flex bg-cover bg-no-repeat relative sm:px-0 mx-auto">
      {children}
    </div>
  );
}