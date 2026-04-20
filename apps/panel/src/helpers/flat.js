export function unflatten(data, prefix) {
	const result = {};
	const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
	for (const [key, value] of Object.entries(data)) {
		if (!key.startsWith(normalizedPrefix)) continue;
		const path = key.slice(normalizedPrefix.length).split("/");
		let current = result;
		path.forEach((part, index) => {
			const isLast = index === path.length - 1;
			if (isLast) {
				current[part] = value;
			} else {
				const nextPart = path[index + 1];
				const isNextArray = /^\d+$/.test(nextPart);
				if (current[part] === undefined) {
					current[part] = isNextArray ? [] : {};
				}
				current = current[part];
			}
		});
	}
	return result;
}
export function flatten(obj, prefix = "", res = {}) {
	if (obj === null || typeof obj !== "object") return res;
	for (const [key, value] of Object.entries(obj)) {
		const newKey = prefix ? `${prefix}${key}` : key;
		if (value !== null && typeof value === "object") {
			flatten(value, `${newKey}/`, res);
		} else {
			res[newKey] = String(value ?? "");
		}
	}
	return res;
}
