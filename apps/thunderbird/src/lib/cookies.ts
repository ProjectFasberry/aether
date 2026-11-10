import type { Context } from "elysia";

type Properties = {
  cookies: Context["cookie"],
  key: string,
  domain: string
}

type SetCookie = Properties & {
  value: string,
  expires: Date,
}

export const cookie = {
  set({ key, domain, cookies, expires, value }: SetCookie) {
    cookies[key].domain = domain
    cookies[key].value = value
    cookies[key].expires = expires
    cookies[key].httpOnly = true
    cookies[key].path = "/"
    cookies[key].secure = true
    cookies[key].sameSite = "lax"
  },
  unset({ cookies, key, domain }: Properties) {
    cookies[key].domain = domain
    cookies[key].value = ""
    cookies[key].expires = new Date(0)
    cookies[key].path = "/"
    cookies[key].secure = true
    cookies[key].maxAge = 0
    cookies[key].sameSite = "lax"
  }
}
