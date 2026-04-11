export const isProduction = import.meta.env.PROD;
export const isDevelopment = import.meta.env.DEV;

export const HOST = import.meta.env.VITE_APP_HOST;
export const PORT = import.meta.env.VITE_APP_PORT;

export const API_PREFIX_URL = import.meta.env.VITE_API_URL;
export const PANEL_API_PREFIX_URL = import.meta.env.VITE_PANEL_API_PREFIX_URL;

export const LANDING_URL = import.meta.env.VITE_LANDING_URL!;
export const MAIN_DOMAIN = import.meta.env.VITE_MAIN_DOMAIN;
export const PLAY_IP = `play.${MAIN_DOMAIN}`;
export const STATUS_URL = import.meta.env.VITE_STATUS_URL;
export const APP_URL = import.meta.env.VITE_APP_URL;

export const VOLUME_URL = import.meta.env.VITE_VOLUME_URL;

export const CAP_INSTANCE_URL = import.meta.env.VITE_CAP_URL;
export const CAP_SITEKEY = import.meta.env.VITE_CAP_SITE_KEY;

export const APAY_TAG = import.meta.env.VITE_APAY_TAG;

export const POF_IS_ACTIVE: boolean = import.meta.env.VITE_POF_IS_ACTIVE
	? import.meta.env.VITE_POF_IS_ACTIVE === "true"
		? true
		: false
	: true;
