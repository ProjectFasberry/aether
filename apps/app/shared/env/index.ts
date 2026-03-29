const env = import.meta.env;

export const isProduction = env.PROD;
export const isDevelopment = env.DEV;

export const HOST = env.VITE_APP_HOST;
export const PORT = env.VITE_APP_PORT;

export const API_PREFIX_URL = env.VITE_API_URL;
export const PANEL_API_PREFIX_URL = env.VITE_PANEL_API_PREFIX_URL;

export const LANDING_URL = env.VITE_LANDING_URL!;
export const MAIN_DOMAIN = env.VITE_MAIN_DOMAIN;
export const PLAY_IP = `play.${MAIN_DOMAIN}`;
export const STATUS_URL = env.VITE_STATUS_URL;
export const APP_URL = env.VITE_APP_URL;

export const VOLUME_URL = env.VITE_VOLUME_URL;

export const CAP_INSTANCE_URL = env.VITE_CAP_URL;
export const CAP_SITEKEY = env.VITE_CAP_SITE_KEY;

export const APAY_TAG = env.VITE_APAY_TAG;

export const POF_IS_ACTIVE: boolean = env.VITE_POF_IS_ACTIVE
	? env.VITE_POF_IS_ACTIVE === "true"
		? true
		: false
	: true;
