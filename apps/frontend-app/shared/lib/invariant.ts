export function invariant(
  predicate: unknown, 
  errorMessage: Error | string = "Assertion Failed"
): asserts predicate {
  if (!predicate) {
    throw typeof errorMessage === "string" ? new Error(errorMessage) : errorMessage;
  }
}