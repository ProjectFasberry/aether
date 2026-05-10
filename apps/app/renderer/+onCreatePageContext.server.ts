import type { PageContextServer } from 'vike/types';
import { createCtx } from '@reatom/framework';
import { currentUserState, getMe } from "@/shared/models/current-user.model";
import { logRouting } from '@/shared/lib/log';
import { isBotRequest } from '@/shared/lib/bot-guard';
import { redirect } from 'vike/abort';
import { appState, getAppDictionaries, getAppOptions, initCookie, AppOptionsPayload, AppDictionaries, AppOptionsPayloadExtend } from '@/shared/models/app/base.model';
import { setupUrlAtomSettings } from '@reatom/url';
import { snapshotAtom } from '@/shared/models/ssr';
import { getTopCountry } from '@/shared/lib/utils';

type MePayload = ExtractApiData<"getMe">["data"]

const CB_BY_PAYLOAD: Record<"BANNED", (pageCtx: PageContextServer) => void> = {
  "BANNED": ({ urlParsed }) => {
    if (!urlParsed.pathname.includes('/banned')) {
      throw redirect("/banned");
    }
  }
}

export const onCreatePageContext = async (pageCtx: PageContextServer) => {
  if (import.meta.env.DEV) {
    const url = new URL(pageCtx.urlOriginal);

    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
      url.port = "3006";
      throw redirect(url.toString());
    }
  }

  const { headers, urlPathname, locale } = pageCtx;
  if (!headers) return;

  logRouting(urlPathname, "onCreatePageContext.server");

  const ctx = createCtx();

  function updateSnapshot() {
    pageCtx.snapshot = ctx.get(snapshotAtom)
  };

  function setupApp(originalOpts: AppOptionsPayload, headers: NonNullable<PageContextServer["headers"]>, dict: AppDictionaries) {
    const country = getTopCountry(headers["accept-language"])

    const optionsExtended: AppOptionsPayloadExtend = { 
      ...originalOpts, 
      specified: { country } 
    }

    const isMobile = /Mobile|Android|iPhone|iPad/i.test(headers["user-agent"]);
    
    appState.currentState.isMobile(ctx, isMobile)
    appState.dict(ctx, dict);
    appState.options(ctx, optionsExtended);
    
    initCookie(ctx, headers);
  };

  if (isBotRequest(headers, urlPathname)) {
    updateSnapshot()
    return;
  }

  const url = new URL(urlPathname, `http://${headers["host"]}`);
  setupUrlAtomSettings(ctx, () => url)

  const options = await getAppOptions({ headers })
    .then(r => r)
    .catch((e) => {
      console.warn("Options is not defined")
      throw e
    })

  const dictionaries = await getAppDictionaries({ headers })
    .then(r => r)
    .catch((e) => {
      console.warn("Dictionaries is not defined", e)
      return {}
    })

  setupApp(options, headers, dictionaries)

  if (!options.flags.isAuthed) {
    updateSnapshot()
    return
  }

  const me: MePayload | null = await getMe({ headers })
    .then(r => r)
    .catch((e) => {
      if (e instanceof Error) {
        const exec = CB_BY_PAYLOAD[e.message as keyof typeof CB_BY_PAYLOAD];
        exec?.(pageCtx)
        return null
      }

      return null;
    })

  if (me) currentUserState(ctx, me);

  updateSnapshot();
};