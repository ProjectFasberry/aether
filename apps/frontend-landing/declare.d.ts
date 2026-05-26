import { Rec } from "@reatom/framework";
import { PersistRecord } from "@reatom/persist";
import { Locale } from "./shared/locales";
import { JSXElement } from "solid-js";
import 'solid-js';

declare global {
  namespace Vike {
    interface PageContext {
      snapshot: Rec<PersistRecord<unknown>>,
      Page: () => JSXElement,
      locale: Locale,
    }
  }

  type PaginatedMeta = {
    hasNextPage: boolean,
    hasPrevPage: boolean,
    endCursor?: string,
    startCursor?: string
  }

  type WrappedResponse<T> = { data: T } | { error: string };
  type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T][]
}

declare module 'solid-js' {
  namespace JSX {
    interface SvgSVGAttributes<T> {
      focusable?: boolean | string;
    }
  }
}

export { }
