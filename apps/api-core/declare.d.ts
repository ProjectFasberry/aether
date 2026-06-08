declare global {
  interface PaginatedMeta {
    hasNextPage: boolean,
    hasPrevPage: boolean,
    startCursor?: string,
    endCursor?: string
  }

  type Awaitable<T> = T | Promise<T>;
}

declare module "*.txt"
declare module "*.db"
declare module "*.png"
declare module "*.jpg"

export { }
