import type { Rec } from "@reatom/framework"
import type { PersistRecord } from "@reatom/persist"
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

  type ExtractApiParams<T extends keyof operations> =
    operations[T] extends { parameters: infer Data }
    ? Data
    : never;

  type SnapshotMeta = Partial<{ name: string }>;

  type Snapshot = Record<string, PersistRecord<unknown>> & {
    __meta?: SnapshotMeta;
  }

  namespace Vike {
    interface GlobalContext {
      Page: () => React.JSX.Element
    }

    interface PageContext {
      snapshot: Snapshot,
      locale: Locale,
      Page: () => React.JSX.Element
    }
  }
}