import type { PageContextServer } from 'vike/types';
import { createCtx } from '@reatom/core';
import { currentUserState, getMe } from "@/shared/models/current-user.model";
import { devLog, logRouting } from '@/shared/lib/log';
import { isBotRequest } from '@/shared/lib/bot-guard';
import { redirect } from 'vike/abort';
import { appState, appOptionsInit, getAppDictionaries, getAppOptions, app } from '@/shared/models/app.model';
import { AppOptionsPayload } from '@repo/shared/types/entities/other';
import { setupUrlAtomSettings } from '@reatom/url';
import { snapshotAtom } from '@/shared/lib/reatom-helpers';

type MePayload = ExtractApiData<"getMe">["data"]

function getTopCountry(acceptLanguage?: string): string | null {
  if (!acceptLanguage) return null

  let best: { country: string; q: number } | null = null

  for (const part of acceptLanguage.split(',')) {
    const [lang, qRaw] = part.trim().split(';')
    const country = lang.split('-')[1]
    if (!country) continue

    const q = qRaw?.startsWith('q=') ? Number(qRaw.slice(2)) : 1
    if (!best || q > best.q) {
      best = { country, q }
    }
  }

  return best?.country ?? null
}

export const onCreatePageContext = async (pageCtx: PageContextServer) => {
  if (import.meta.env.DEV) {
    if (pageCtx.urlOriginal.startsWith("http://localhost")) {
      throw redirect("http://127.0.0.1:3006")
    }
  }

  logRouting(pageCtx.urlPathname, "onCreatePageContext");

  const { headers, urlPathname, locale } = pageCtx;
  if (!headers) return;

  const ctx = createCtx();

  function updateSnapshot() {
    const result = ctx.get(snapshotAtom)
    devLog("updateSnapshot.result", result)
    pageCtx.snapshot = result
  };

  function setupApp(options: AppOptionsPayload, dictionaries: Record<string, string>) {
    if (!headers) return;

    const country = getTopCountry(headers["accept-language"])

    const dictionary = new Map(Object.entries(dictionaries));
    const optionsExtend = { ...options, locale, country }
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(headers["user-agent"]);

    appState.isMobile(ctx, isMobile)
    appState.dict(ctx, dictionary);
    appState.options(ctx, optionsExtend);
    app.initCookie(ctx, pageCtx);
  };

  if (isBotRequest(headers, urlPathname)) {
    devLog("Bot request prevented")
    setupApp(appOptionsInit, {});
    updateSnapshot()
    return;
  }

  const url = new URL(pageCtx.urlPathname, `http://${headers["host"]}`);
  setupUrlAtomSettings(ctx, () => url)

  const options: AppOptionsPayload = await getAppOptions({ headers })
    .then(r => r)
    .catch((e) => {
      devLog('getAppOptions.failed', e);
      throw e
    })

  const dictionaries: Record<string, string> = await getAppDictionaries({ headers })
    .then(r => r)
    .catch((e) => {
      devLog('getAppDictionaries.failed', e)
      return {}
    })

  setupApp(options, dictionaries)

  if (!options.isAuth) {
    updateSnapshot()
    return
  }

  const me: MePayload | null = await getMe({ headers })
    .then(r => r)
    .catch((reason) => {
      if (reason instanceof Error && reason.message === 'banned') {
        if (!pageCtx.urlParsed.pathname.includes('/banned')) {
          throw redirect("/banned");
        }
      }

      return null;
    })

  if (me) {
    currentUserState(ctx, me);
  }

  updateSnapshot();
};