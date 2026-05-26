export async function wrapClient<T>(
  fn: () => Promise<{ json: () => Promise<any> }>
): Promise<T> {
  const response = await fn();
  const result = await response.json() as WrappedResponse<T>;

  if ('error' in result) {
    throw new Error(result.error);
  }

  return result.data;
}
