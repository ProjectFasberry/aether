import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import vike from "vike/plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";
import vikeSolid from "vike-solid/vite";
import svg from '@neodx/svg/vite';
import { visualizer } from "rollup-plugin-visualizer";
import { cloudflare } from '@cloudflare/vite-plugin'

const CHUNK_GROUPS = [
  { name: 'lib', matches: ['reatom', 'zod', 'ky'] },
  { name: 'editor', matches: ['tiptap'] },
  { name: "framework", matches: ["solid-js"] },
  { name: 'ui', matches: ['ark-ui', 'zag-js', 'corvu'] },
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      vike(),
      vikeSolid(),
      cloudflare({
        viteEnvironment: { name: 'ssr' }
      }),
      tailwindcss(),
      tsconfigPaths(),
      svg({
        inputRoot: 'assets/svg',
        output: 'public/sprites',
        fileName: '{name}.{hash:8}.svg',
        metadata: 'shared/sprite.gen.ts',
        resetColors: false
      }),
      visualizer({
        filename: "stats.html",
        template: "treemap",
        gzipSize: true
      }),
    ],
    build: {
      target: "esnext",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            for (const group of CHUNK_GROUPS) {
              if (group.matches.some(match => id.includes(match))) {
                return group.name;
              }
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
    ssr: {
      noExternal: process.env.NODE_ENV === 'production' || undefined
    },
    css: {
      postcss: {
        plugins: [
          {
            postcssPlugin: "replace-css-env",
            Once(root) {
              root.walkDecls((decl) => {
                if (decl.value.includes("_VOLUME_URL")) {
                  decl.value = decl.value.replaceAll("_VOLUME_URL", env.VITE_VOLUME_URL);
                }
              });
            },
          },
        ],
      },
    },
  };
});
