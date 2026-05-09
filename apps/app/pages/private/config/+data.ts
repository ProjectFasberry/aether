import { useConfig } from 'vike-react/useConfig'
import { wrapTitle } from '@/shared/lib/wrap-title'
import { logRouting } from '@/shared/lib/log';
import { PageContextServer } from 'vike/types';

function metadata() {
  return {
    title: wrapTitle("Конфиг"),
  }
}

export async function data(pageCtx: PageContextServer) {
  logRouting(pageCtx.urlPathname, "data");

  const config = useConfig()
  config(metadata())
}