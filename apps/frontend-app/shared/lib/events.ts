import { type Action, type Atom, atom, type AtomMut, type Ctx, onConnect, onDisconnect, withReset } from "@reatom/framework";
import { LOGGING } from "../models/devtools/debug";
import { logger } from "./logger";

type WithReset<T> = AtomMut<T | null> & {
  reset: Action<[], T | null>;
}
type Page = { unsubscribe: () => void }
type PageHandler<Args extends any[] = []> = (ctx: Ctx, atom: WithReset<Page>, ...args: Args) => Promise<void> | void;

type PageModelConfig<TSpy> = {
  name: string;
  onConnAction?: PageHandler<[isConnected: () => boolean]>;
  onDisconnAction?: PageHandler;
  onAfterDisconn?: PageHandler;
} & (
    | { spyedAtom: Atom<TSpy>; onSpyAction: PageHandler<[payload: TSpy]> }
    | { spyedAtom?: never; onSpyAction?: never }
  )

const pageLogger = logger.withTag("Page");

export const createPageModel = <TSpy = unknown>({
  name, onConnAction, onDisconnAction, onAfterDisconn, spyedAtom, onSpyAction
}: PageModelConfig<TSpy>) => {
  const dataAtom = atom<Nullable<Page>>(null, `${name}.page`).pipe(withReset());

  onConnect(dataAtom, (ctx) => {
    if (LOGGING.page) {
      pageLogger.info(`${name}.page connected`)
    }

    return onConnAction?.(ctx, dataAtom, ctx.isConnected)
  });

  onDisconnect(dataAtom, (ctx) => {
    if (LOGGING.page) {
      pageLogger.info(`${name}.page disconnected`)
    }

    const pageData = ctx.get(dataAtom);

    onDisconnAction?.(ctx, dataAtom);

    pageData?.unsubscribe?.()
    dataAtom.reset(ctx)

    onAfterDisconn?.(ctx, dataAtom)
  })

  if (spyedAtom && onSpyAction) {
    spyedAtom.onChange((ctx, payload) => onSpyAction(ctx, dataAtom, payload))
  }

  return { dataAtom }
}

export const listenBackOnce = (cb: () => void) => {
  window.history.pushState({ active: true }, '');

  const handler = () => {
    cb();
    window.removeEventListener('popstate', handler);
  };

  window.addEventListener('popstate', handler);

  return () => {
    window.removeEventListener('popstate', handler);
  };
};