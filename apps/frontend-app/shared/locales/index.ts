export type Locale = (typeof locales)[number]

const locales = ["ru", "en"] as const
const localeDefault: Locale = locales[0]

export { locales, localeDefault };