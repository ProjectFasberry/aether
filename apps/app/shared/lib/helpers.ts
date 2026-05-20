export const isNullish = <T>(value: T | null | undefined): value is null | undefined => {
  return value === null || value === undefined;
};

export const isMap = <K = any, V = any>(val: unknown): val is Map<K, V> => {
  return val instanceof Map;
};export function isEmptyArray(data: unknown): boolean {
  return !Array.isArray(data) || data.length === 0;
}

export const isError = (e: unknown): e is Error => {
  return e instanceof Error;
}
