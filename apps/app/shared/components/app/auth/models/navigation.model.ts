import { action, atom, Atom, AtomMut, Ctx, isAtom } from "@reatom/core";
import { AsyncCtx, withAssign } from "@reatom/framework";

export type NavigationSteps = {
  id: string,
  validators?: {
    toNext?: Atom<boolean> | boolean,
    toBack?: Atom<boolean> | boolean
  }
  cb?: (ctx: Ctx | AsyncCtx) => unknown,
}

export const createNavigationModel = ({
  steps,
  name,
  typeAtom,
  opts = {
    depsWithLast: true
  }
}: {
  steps: NavigationSteps[],
  name: string,
  typeAtom: AtomMut<string>,
  opts?: Partial<{
    fallbackNext: () => void,
    depsWithLast: boolean
  }>
}) => {
  const currentIdx = atom((ctx) => steps.findIndex(s => s.id === ctx.spy(typeAtom)));
  const isLastStepAtom = atom((ctx) => ctx.spy(currentIdx) === steps.length - 1)
  const isFirstStepAtom = atom((ctx) => ctx.spy(currentIdx) === 0);

  const createValidator = (type: "toNext" | "toBack") => atom((ctx) => {
    const step = steps[ctx.spy(currentIdx)];
    const validator = step?.validators?.[type];

    if (validator == null) return true;

    return isAtom(validator) ? ctx.spy(validator) : validator;
  }, `${name}.isStep${type === "toNext" ? "Next" : "Back"}Valid`);

  const isStepNextValidAtom = createValidator("toNext");
  const isStepBackValidAtom = createValidator("toBack");

  const canGoBackAtom = atom((ctx) => {
    const isFirst = ctx.spy(isFirstStepAtom);
    const isValid = ctx.spy(isStepBackValidAtom);

    if (opts?.fallbackNext) {
      return isValid
    }

    return isValid && !isFirst
  }, `${name}.canGoBack`);

  const canGoNextAtom = atom((ctx) => {
    const isLast = ctx.spy(isLastStepAtom)
    const isValid = ctx.spy(isStepNextValidAtom);

    if (!opts?.depsWithLast) {
      return isValid
    }

    return isValid && !isLast
  }, `${name}.canGoNext`);

  const events = atom(null, `${name}.nav`).pipe(
    withAssign(() => ({
      back: action((ctx): void => {
        const isFirst = ctx.get(isFirstStepAtom)
        if (isFirst) {
          opts?.fallbackNext?.()
          return;
        }

        const currIdx = ctx.get(currentIdx);
        const prev = steps[currIdx - 1]
        if (!prev) return;

        typeAtom(ctx, prev.id)
      }),
      continue: action((ctx): boolean => {
        const canGoNext = ctx.get(canGoNextAtom)
        if (!canGoNext) return false;

        const currIdx = ctx.get(currentIdx);
        const next = steps[currIdx + 1];
        if (!next) return false;

        const curr = steps[currIdx]
        if (curr.cb && curr.cb(ctx) === false) return false;

        typeAtom(ctx, next.id)
        return true;
      }),
    }))
  )

  return {
    isStepNextValidAtom,
    isStepBackValidAtom,
    canGoBackAtom,
    canGoNextAtom,
    events,
    isLastStepAtom,
    isFirstStepAtom
  };
};
