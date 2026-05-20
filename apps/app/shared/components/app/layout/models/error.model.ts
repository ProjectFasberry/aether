import { action, atom, withAssign } from "@reatom/framework";

export const errorBoundary = atom(null).pipe(
  withAssign((_, name) => ({
    log: (e: Error, info: React.ErrorInfo) => {
      console.error(e, info)
    }
  }))
)
