declare global {
	interface PaginatedMeta {
		hasNextPage: boolean;
		hasPrevPage: boolean;
		endCursor?: string;
		startCursor?: string;
  }
}

export {};
