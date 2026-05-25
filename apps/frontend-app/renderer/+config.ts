import vikeReact from "vike-react/config";
import type { Config } from "vike/types";

export default {
	title: "Fasberry",
	extends: [vikeReact],
	reactStrictMode: false,
	passToClient: ["snapshot", "locale"],
	ssr: false,
	redirects: {
		"/chat": "https://discord.gg/X4x6Unj89g",
	},
} satisfies Config;
