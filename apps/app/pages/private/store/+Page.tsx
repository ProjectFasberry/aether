import { StorePrivated } from "@/shared/components/app/private/components/store";
import { searchParamsAtom } from "@/shared/components/app/private/models/store.model";
import { createPageModel } from "@/shared/lib/events";
import { pageCtxAtom } from "@/shared/models/page-context.model";
import { useAtom } from "@reatom/npm-react";

const page = createPageModel({
  name: "store",
  onSpyAction: (ctx, dataAtom, pageCtx) => {
    searchParamsAtom(ctx, (state) => pageCtx?.urlParsed.search ?? state)
  },
  spyedAtom: pageCtxAtom
})

export default function Page() {
  const [_] = useAtom(page.dataAtom)

  return (
    <div className="bg-neutral-900 rounded-xl p-4">
      <StorePrivated />
    </div>
  )
}