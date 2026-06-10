import { invariant } from "#/utils"
import { urlsService } from "#/shared/services/urls"
import { isProduction } from "#/shared/env"

const FALLBACK_DOMAIN = "127.0.0.1";
export const SESSION_KEY = "session";

export function getClientDomain() {
  if (!isProduction) return FALLBACK_DOMAIN;

  const domain = urlsService.getData().get("domain")
  invariant(domain, "Client domain is not defined");

  return `.${domain}`
}
