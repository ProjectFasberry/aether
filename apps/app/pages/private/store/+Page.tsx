import { StorePrivated } from "@/shared/components/app/private/components/store";
import { storeState } from "@/shared/components/app/private/models/store.model";
import { createPageModel } from "@/shared/lib/events";
import { pageState } from "@/shared/models/page-context.model";
import { useAtom } from "@reatom/npm-react";

const page = createPageModel({
  name: "store",
  onSpyAction: (ctx, dataAtom, urlParsed) => {
    storeState.searchParams(ctx, (state) => urlParsed?.search ?? state)
  },
  spyedAtom: pageState.urlParsed
})

export default function Page() {
  const [_] = useAtom(page.dataAtom)

  return <StorePrivated />
}
