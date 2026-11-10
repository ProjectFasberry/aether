/** A stable one-line error message for logs and lifecycle reasons. */
export function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
