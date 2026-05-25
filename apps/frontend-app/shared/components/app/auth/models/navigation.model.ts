import { type Action, atom, type Atom, type AtomMut, isAtom } from "@reatom/framework";
import { type AsyncAction, reatomAsync, withStatusesAtom } from "@reatom/framework";

export type NavigationSteps = {
  id: string,
  validators?: {
    toNext?: Atom<boolean> | boolean,
    toBack?: Atom<boolean> | boolean
  }
  cb?: AsyncAction<[], boolean> | Action<[], boolean>,
}

type NavigationParams = {
  steps: NavigationSteps[],
  name?: string,
  typeAtom: AtomMut<string>,
  opts?: Partial<{
    fallbackBack: () => void,
    depsWithLast: boolean,
    withLog: boolean
  }>
}

export const createNavigationModel = ({
  steps, name, typeAtom,
  opts = {
    depsWithLast: true,
    withLog: false
  }
}: NavigationParams) => {
  const currentIdx = atom((ctx) => steps.findIndex(s => s.id === ctx.spy(typeAtom)));

  const isLastStepAtom = atom((ctx) => ctx.spy(currentIdx) === steps.length - 1)
  const isFirstStepAtom = atom((ctx) => ctx.spy(currentIdx) === 0);

  const createValidator = (type: "toNext" | "toBack") => atom((ctx) => {
    const currStep = steps[ctx.spy(currentIdx)];
    const validator = currStep?.validators?.[type];

    if (validator == null) return true;
    if (isAtom(validator)) return ctx.spy(validator)

    return validator
  });

  const isStepNextValidAtom = createValidator("toNext");
  const isStepBackValidAtom = createValidator("toBack");
  
  const canGoBackAtom = atom((ctx) => {
    const isValid = ctx.spy(isStepBackValidAtom);
    if (opts?.fallbackBack) return isValid

    const isFirst = ctx.spy(isFirstStepAtom);
    return isValid && !isFirst
  });

  const canGoNextAtom = atom((ctx) => {    
    const isValid = ctx.spy(isStepNextValidAtom);
    if (!opts?.depsWithLast) return isValid;

    const isLast = ctx.spy(isLastStepAtom)
    return isValid && !isLast
  });

  const back = reatomAsync(async (ctx) => {
    const isFirst = ctx.get(isFirstStepAtom)
    if (isFirst && opts?.fallbackBack) {
      return opts.fallbackBack()
    }

    const currIdx = ctx.get(currentIdx);
    const prev = steps[currIdx - 1]
    if (!prev) return;

    typeAtom(ctx, prev.id)
  }, "_").pipe(
    withStatusesAtom()
  );

  const next = reatomAsync(async (ctx) => {
    const canGoNext = ctx.get(canGoNextAtom)
    if (!canGoNext) return false;

    const currIdx = ctx.get(currentIdx);
    const next = steps[currIdx + 1];
    if (!next) return false;

    const curr = steps[currIdx];

    if (curr?.cb) {      
      const result = await curr.cb(ctx);
      if (!result) return false;
    }

    typeAtom(ctx, next.id)
    return true;
  }, "_").pipe(
    withStatusesAtom()
  )

  return {
    isStepNextValidAtom,
    isStepBackValidAtom,
    canGoBackAtom,
    canGoNextAtom,
    back, 
    next,
    isLastStepAtom,
    isFirstStepAtom
  };
};