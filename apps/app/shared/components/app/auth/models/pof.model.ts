import { POF_IS_ACTIVE } from "@/shared/env"
import { appOptionsAtom } from "@/shared/models/app.model"
import { atom } from "@reatom/core"
import { withAssign, withInit, withReset } from "@reatom/framework"

export const pof = atom(null, "pof").pipe(
  withAssign((_, name) => ({
    isActive: atom(POF_IS_ACTIVE, `${name}.isActive`).pipe(
      withInit((ctx, target) => {
        let res = POF_IS_ACTIVE;

        const isWl = ctx.get(appOptionsAtom).isWl;

        if (isWl) { 
          res = false
        }

        if (import.meta.env.DEV) {
          console.log(res);
        }

        return res
      })
    ),
    showTokenVerifySectionAtom: atom(false, `${name}.showTokenVerifySection`).pipe(
      withReset()
    ),
    token: atom<Nullable<string>>(null, `${name}.token`).pipe(
      withReset()
    )
  }))
)