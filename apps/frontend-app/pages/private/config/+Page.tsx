import { useAtom } from "@reatom/npm-react";
import { pageState } from "@/shared/models/page-context.model";
import { actionsSearchParamsAtom } from "@/shared/components/app/private/models/actions.model";
import { createPageModel } from "@/shared/lib/events";
import { Config } from "@/shared/components/app/private/components/config";

const page = createPageModel({
  name: "private.config",
  onSpyAction: (ctx, dataAtom, urlParsed) => {
    actionsSearchParamsAtom(ctx, (state) => urlParsed?.search ?? state)
  },
  spyedAtom: pageState.urlParsed
})

export default function Page() {
  const [_] = useAtom(page.dataAtom)

  return <Config />
}
