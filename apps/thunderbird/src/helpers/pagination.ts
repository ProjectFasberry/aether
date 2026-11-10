export const getDirection = (
  asc: boolean | undefined | null,
  defaultDirection: "asc" | "desc" = "desc"
): "asc" | "desc" => {
  if (typeof asc !== 'boolean') {
    return defaultDirection;
  }

  return asc ? "asc" : "desc";
}

export function toPageMeta(res: Partial<PaginatedMeta>): PaginatedMeta {
	return {
		hasNextPage: !!res.hasNextPage,
		hasPrevPage: !!res.hasPrevPage,
		endCursor: res.endCursor,
		startCursor: res.startCursor,
	};
}
