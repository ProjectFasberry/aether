import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import vike from "vike/plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

// @ts-expect-error
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd());

	return {
		plugins: [vike(), react(), tailwindcss(), tsconfigPaths()],
		build: {
			target: "es2022",
			sourcemap: true,
		},
		resolve: {
			dedupe: ["react", "react-dom"],
			alias: {
				"@": path.resolve(__dirname, "./"),
				"@tabler/icons-react": "@tabler/icons-react/dist/esm/icons/index.mjs",
			},
		},
		css: {
			postcss: {
				plugins: [
					{
						postcssPlugin: "replace-css-env",
						Once(root) {
							root.walkDecls((decl) => {
								if (decl.value.includes("_VOLUME_URL")) {
									decl.value = decl.value.replaceAll("_VOLUME_URL", env.VITE_VOLUME_PREFIX);
								}
							});
						},
					},
				],
			},
		},
		server: {
			allowedHosts: true,
		},
	};
});
