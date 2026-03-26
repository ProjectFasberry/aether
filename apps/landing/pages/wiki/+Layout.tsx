import { WikiNavigation } from "@/pages/wiki/(components)/wiki-navigation-bar";
import { wikiCategoriesAction } from "@/pages/wiki/(components)/wiki.model";
import { useUpdate } from "@reatom/npm-react";
import { MainWrapperPage } from "@repo/ui/main-wrapper";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  useUpdate(wikiCategoriesAction, [])

  return (
    <MainWrapperPage>
      <div className="flex flex-col lg:flex-row items-start justify-between bg-transparent w-full gap-x-4">
        <WikiNavigation />
        {children}
      </div>
    </MainWrapperPage>
  )
}