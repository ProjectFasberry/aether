export function safeJsonParse<T>(str: string): { ok: true; value: T } | { ok: false; error: Error } {
  try {
    return { ok: true, value: JSON.parse(str) as T };
  } catch (err) {
    return { ok: false, error: err as Error };
  }
}

export function invariant(predicate: unknown, errorMessage: Error | string = "Assertion Failed"): asserts predicate {
  if (!predicate) {
    throw typeof errorMessage === "string" ? new Error(errorMessage) : errorMessage;
  }
}

export const isError = (e: Error | unknown): e is Error => e instanceof Error

