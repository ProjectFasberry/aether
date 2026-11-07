export function updateInDeep<T>(obj: T, path: string, value: unknown): T {
	const [head, ...tail] = path.split(".");

	if (obj === null || typeof obj !== "object" || !(head in (obj as object))) {
		return obj;
	}

	if (tail.length > 0) {
		const subPath = tail.join(".");
		const subObj = (obj as Record<string, unknown>)[head];

		const newSubObj = updateInDeep(subObj, subPath, value);

		return subObj !== newSubObj ? { ...obj, [head]: newSubObj } : obj;
	}

	if (obj && typeof obj === "object" && Object.hasOwn(obj, head)) {
		return { ...obj, [head]: value } as T;
	}

	return obj;
}
export function hasKeyDeep(obj: Record<string, unknown>, path: string): boolean {
	return (
		path.split(".").reduce<unknown>((acc, part) => {
			if (acc && typeof acc === "object" && Object.hasOwn(acc, part)) {
				return (acc as Record<string, unknown>)[part];
			}

			return undefined;
		}, obj) !== undefined
	);
}

export const getDeepValue = (obj: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && Object.hasOwn(acc, part)) {
      return (acc as Record<string, unknown>)[part];
    }

    return undefined;
  }, obj);
