import vikeReact from "vike-react/config";
import type { Config } from "vike/types";

export default {
  title: "Fasberry",
  extends: [vikeReact],
  reactStrictMode: false,
  prefetchStaticAssets: 'viewport',
  passToClient: ['snapshot'],
  ssr: true,
  redirects: {
    "/wiki": "/wiki/general"
  }
} satisfies Config;
