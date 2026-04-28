import { useConfig } from 'vike-react/useConfig'
import { wrapTitle } from '@/shared/lib/wrap-title'
import { logRouting } from '@/shared/lib/log';
import { PageContextServer } from 'vike/types';

function metadata() {
  return {
    title: wrapTitle("Аналитика"),
  }
}

export async function data(pageContext: PageContextServer) {
  logRouting(pageContext.urlPathname, "data");

  const config = useConfig()
  config(metadata())
}