declare global {
  interface PaginatedMeta {
    hasNextPage: boolean,
    hasPrevPage: boolean,
    startCursor?: string,
    endCursor?: string
  }
}

declare module "*.txt"
declare module "*.db"
declare module "*.png"
declare module "*.jpg"

export { }