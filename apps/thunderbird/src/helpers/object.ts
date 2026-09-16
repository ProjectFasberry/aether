export function updateInDeep<T>(obj: T, path: string, value: any): T {
	const [head, ...tail] = path.split(".");

	if (obj === null || typeof obj !== "object" || !(head in (obj as object))) {
		return obj;
	}

	if (tail.length > 0) {
		const subPath = tail.join(".");
		const subObj = (obj as any)[head];

		const newSubObj = updateInDeep(subObj, subPath, value);

		return subObj !== newSubObj ? { ...obj, [head]: newSubObj } : obj;
	}

	if (obj && typeof obj === "object" && Object.hasOwn(obj, head)) {
		return { ...obj, [head]: value };
	}

	return obj;
}
export function hasKeyDeep(obj: Record<string, any>, path: string): boolean {
	return (
		path.split(".").reduce((acc, part) => {
			return acc && typeof acc === "object" && Object.hasOwn(acc, part) ? acc[part] : undefined;
		}, obj as any) !== undefined
	);
}
export const getDeepValue = (obj: any, path: string) =>
  path.split(".").reduce((acc, part) => acc && acc[part], obj);
