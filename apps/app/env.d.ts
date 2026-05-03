declare global {
  interface ViteTypeOptions {
    strictImportMetaEnv: unknown
  }

  interface ImportMetaEnv {
    readonly VITE_APP_HOST: string;
    readonly VITE_APP_PORT: string;
    readonly VITE_API_URL: string;
    readonly VITE_LANDING_URL: string;
    readonly VITE_MAIN_DOMAIN: string;
    readonly VITE_STATUS_URL: string;
    readonly VITE_APP_URL: string;
    readonly VITE_VOLUME_URL: string;
    readonly VITE_CAP_URL: string;
    readonly VITE_CAP_SITE_KEY: string;
    readonly VITE_APAY_TAG: string;
    readonly VITE_POF_IS_ACTIVE: string;
    readonly VITE_API_HOST: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export { }