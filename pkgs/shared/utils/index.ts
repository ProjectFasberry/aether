type SafeParseJsonOut<T> = { ok: true, data: T, err?: never } | { ok: false, data: null, err: Error }

export function safeParseJson<T>(str: string): SafeParseJsonOut<T> {
  try {
    return { ok: true, data: JSON.parse(str) as T };
  } catch (e) {
    return { ok: false, data: null, err: e instanceof Error ? e : new Error(String(e)) };
  }
}