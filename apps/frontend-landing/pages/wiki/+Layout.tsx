import { WikiNavigation } from "@/pages/wiki/(components)/wiki-navigation-bar";
import { wikiCategories } from "@/pages/wiki/(components)/wiki.model";
import { MainWrapperPage } from "@/shared/ui/main-wrapper";
import { useCtx } from "@reatom/npm-solid-js";
import { JSXElement, onMount } from "solid-js";

export default function Layout(props: { children: JSXElement }) {
  const ctx = useCtx();

  onMount(() => {
    wikiCategories.fetch(ctx)
  })

  return (
    <MainWrapperPage>
      <div class="flex flex-col lg:flex-row items-start justify-between bg-transparent w-full gap-x-4">
        <WikiNavigation />
        {props.children}
      </div>
    </MainWrapperPage>
  )
}
