import { safeJsonParse as safeJsonParseImported } from "@repo/shared/lib/utils";

export const safeJsonParse = safeJsonParseImported;

export function wrapMeta(res: Partial<PaginatedMeta>): PaginatedMeta {
	return {
		hasNextPage: res.hasNextPage ?? false,
		hasPrevPage: res.hasPrevPage ?? false,
		endCursor: res.endCursor,
		startCursor: res.startCursor,
	};
}

export function buildUpdates<T extends Record<string, any>>(
	entries: { field: keyof T; value: T[keyof T] }[],
): Partial<T> {
	const result: Partial<T> = {};
	for (const { field, value } of entries) {
		result[field] = value;
	}
	return result;
}
