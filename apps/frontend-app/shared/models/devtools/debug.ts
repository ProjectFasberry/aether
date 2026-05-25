import { toast } from "sonner";

type InfoMessage = "reload-required"

const MSGS: Record<InfoMessage, (name: string) => string> = {
  "reload-required": (name) => `Page reload required for disabling ${name}`
}

function getInfoMsg(key: InfoMessage, name: string): string {
  return MSGS[key]?.(name) ?? `${key}.${name}`;
}

export const DEBUG_MODULES = [
  {
    name: "react-scan",
    activate() {
      const script = document.createElement('script');
      script.id = "react-scan";
      script.src = '//unpkg.com/react-scan/dist/auto.global.js';
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    },
    deactivate() {
      toast.info(getInfoMsg("reload-required", this.name))
    }
  }
]

export const LOGGING = {
  snapshots: false,
  actions: true,
  atoms: true,
  page: true
}