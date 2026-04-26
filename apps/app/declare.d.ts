import type { operations } from "@repo/shared/types/generated/main/schema"

declare global {
  declare module "*.jpg"
  declare module "*.png"
  declare module "*.gif"

  type WrappedResponse<T> = { data: T } | { error: string }

  type PaginatedMeta = {
    hasNextPage: boolean,
    hasPrevPage: boolean,
    endCursor?: string,
    startCursor?: string
  }

  type Maybe<T> = T | undefined
  type Nullable<T> = T | null
  type ReadonlyPartial<T> = Readonly<Partial<T>>
  type ExtractApiData<T extends keyof operations> =
    operations[T]["responses"] extends { 200: { content: { "application/json": infer Data } } }
    ? Data
    : never;

  namespace Vike {
    interface GlobalContext {
      Page: () => React.JSX.Element
    }

    interface PageContext {
      snapshot: Rec<PersistRecord<unknown>>,
      locale: Locale,
      Page: () => React.JSX.Element
    }
  }
}