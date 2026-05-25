// import * as z from "zod";

// const envSchema = z.object({
//   VITE_APP_HOST: z.string(),
//   VITE_APP_PORT: z.string().transform(v => Number(v)),
//   VITE_API_URL: z.url(),
//   VITE_PANEL_API_PREFIX_URL: z.url(),
//   VITE_API_HOST: z.string(),
//   VITE_LANDING_URL: z.url(),
//   VITE_MAIN_DOMAIN: z.string(),
//   VITE_STATUS_URL: z.url(),
//   VITE_APP_URL: z.url(),
//   VITE_VOLUME_URL: z.url(),
//   VITE_CAP_URL: z.url(),
//   VITE_CAP_SITE_KEY: z.string(),
//   VITE_APAY_TAG: z.string()
// })

// export const env = envSchema.safeParse(process.env).data

export const env = {
  VITE_APP_HOST: import.meta.env.VITE_APP_HOST,
  VITE_APP_PORT: import.meta.env.VITE_APP_PORT,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_PANEL_API_PREFIX_URL: import.meta.env.VITE_PANEL_API_PREFIX_URL,
  VITE_API_HOST: import.meta.env.VITE_API_HOST,
  VITE_LANDING_URL: import.meta.env.VITE_LANDING_URL,
  VITE_MAIN_DOMAIN: import.meta.env.VITE_MAIN_DOMAIN,
  VITE_STATUS_URL: import.meta.env.VITE_STATUS_URL,
  VITE_APP_URL: import.meta.env.VITE_APP_URL,
  VITE_VOLUME_URL: import.meta.env.VITE_VOLUME_URL,
  VITE_CAP_URL: import.meta.env.VITE_CAP_URL,
  VITE_CAP_SITE_KEY: import.meta.env.VITE_CAP_SITE_KEY,
  VITE_APAY_TAG: import.meta.env.VITE_APAY_TAG,
  VITE_FORWARDED_FOR: import.meta.env.VITE_FORWARDED_FOR,
  VITE_SOCIAL_TG_URL: import.meta.env.VITE_SOCIAL_TG_URL,
  VITE_SOCIAL_VK_URL: import.meta.env.VITE_SOCIAL_VK_URL,
  VITE_SOCIAL_DISCORD_URL: import.meta.env.VITE_SOCIAL_DISCORD_URL
}

if (typeof window === 'undefined') {
  console.log(env)
}