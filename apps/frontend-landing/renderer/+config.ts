import type { Config } from "vike/types";
import vikeSolid from 'vike-solid/config'

export default {
  title: "Fasberry",
  extends: [vikeSolid],
  passToClient: ['snapshot'],
  ssr: true,
  redirects: {
    "/wiki": "/wiki/general"
  },
  server: true
} satisfies Config;
