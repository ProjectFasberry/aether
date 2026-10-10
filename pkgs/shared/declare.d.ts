declare global {
	interface PaginatedMeta {
		hasNextPage: boolean;
		hasPrevPage: boolean;
		endCursor?: string;
		startCursor?: string;
  }

  // utility type helpers
  type Awaitable<T> = T | Promise<T>;
  type Gettable<T> = T | (() => T)
}

export {};
