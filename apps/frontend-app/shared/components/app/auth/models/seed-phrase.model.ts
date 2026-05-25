import { action, atom, withAssign, withReset } from "@reatom/framework";

export const createPhraseModel = ({
  name
}: {
  name?: string
}) => {
  const modelId = name ?? `seedPhrase.${Date.now()}`;

  const state = atom(null, `_${modelId}.state`).pipe(
    withAssign((_, name) => ({
      errors: atom<Record<string, string>>({}, `${name}.errors`).pipe(withReset()),
      words: atom<string[]>(Array.from({ length: 12 }, () => ""), `${name}.words`).pipe(withReset()),
      repeatWords: atom<string[]>([], `${name}.repeatWords`).pipe(withReset()),
    }))
  )
  const events = atom(null, `_${modelId}.events`).pipe(
    withAssign((_, name) => ({
      updateWords: action((ctx, value: string, vIdx: number) => {
        state.words(ctx, (prev) =>
          prev.map((word, idx) => idx === vIdx ? value.trim().toLowerCase() : word)
        )
      }, `${name}.updateWords`),
      resetAll: action((ctx) => {
        state.words.reset(ctx)
        state.errors.reset(ctx)
        state.repeatWords.reset(ctx)
      }, `${name}.resetAll`),
      updateRepeatWords: action((ctx, value: string, vIdx: number) => {
        state.repeatWords(ctx, (prev) =>
          prev.map((d, idx) => idx === vIdx ? value.trim().toLowerCase() : d)
        )
      }, `${name}.updateRepeatWords`)
    }))
  )
  const isValid = (type: "default" | "repeat" = "default") => atom<boolean>((ctx) => {
    const words = type === 'default' ? ctx.spy(state.words) : ctx.spy(state.repeatWords)
    const hasErrors = Object.keys(ctx.spy(state.errors)).length > 0;
    return words.every(w => w.trim().length > 0) && !hasErrors
  })

  return {
    state: {
      ...state,
      isValid
    },
    events
  }
}