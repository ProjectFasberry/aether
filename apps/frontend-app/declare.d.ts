import type { Rec } from "@reatom/framework"
import type { PersistRecord } from "@reatom/persist"
import type { operations } from "@/shared/types/gen/main/schema"

declare global {
  declare module "*.jpg"
  declare module "*.png"
  declare module "*.gif"
  declare module "@bprogress/core/*"

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

  type ExtractApiErr<
    T extends keyof operations,
    Status extends number = 400
  > = operations[T]["responses"] extends { [K in Status]: { content: { "application/json": infer Data } } }
    ? Data extends { error: any }
    ? Data["error"]
    : never
    : never;

  type ExtractApiParams<T extends keyof operations> =
    operations[T] extends { parameters: infer Data }
    ? Data
    : never;

  type ExtractApiBody<T extends keyof operations> =
    operations[T] extends { requestBody: infer Data }
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
