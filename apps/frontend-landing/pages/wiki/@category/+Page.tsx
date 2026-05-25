import { WikiContentItem } from "@/pages/wiki/(components)/wiki-content";
import { useUpdate } from "@reatom/npm-react";
import { wikiParamAtom } from "@/pages/wiki/(components)/wiki.model";
import { usePageContext } from "vike-react/usePageContext";

export default function Page() {
  const param = usePageContext().routeParams.category

  useUpdate((ctx) => wikiParamAtom(ctx, param), [param])

  return (
    <div className="flex flex-col xl:w-[75%] w-full overflow-hidden lg:w-auto">
      <WikiContentItem />
    </div>
  )
}