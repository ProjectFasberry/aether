import { type BuildEnvironmentOptions, defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vike from "vike/plugin";
import { analyzer } from 'vite-bundle-analyzer'
import svg from '@neodx/svg/vite';
import tsconfigPaths from 'vite-tsconfig-paths'
import path from "node:path"
import { paraglideVitePlugin } from "@inlang/paraglide-js";

type Stage = "staging" | "prod"

type StagePluginOpts = {
  analyzerIsEnabled?: boolean
}

type StageOpts = {
  buildOpts: BuildEnvironmentOptions & {
    chunkHashing?: boolean,
    chunkGroping?: boolean
  },
  pluginOpts: Partial<StagePluginOpts>
}

const STAGES: Record<Stage, StageOpts> = {
  "staging": {
    buildOpts: {
      sourcemap: true,
      minify: "esbuild",
      chunkHashing: true,
      chunkGroping: true
    },
    pluginOpts: {
      analyzerIsEnabled: true
    }
  },
  "prod": {
    buildOpts: {
      sourcemap: false,
      minify: "esbuild"
    },
    pluginOpts: {
      analyzerIsEnabled: false
    }
  }
}

const CHUNK_GROUPS = [
  { name: 'lib', matches: ['reatom', 'zod', 'ky', '@scure'] },
  { name: 'editor', matches: ['@monaco-editor', 'tiptap'] },
  { name: 'ui', matches: ['embla-carousel', 'react-qrcode-logo', '@radix-ui', "floating-ui", 'vaul', '@monaco-editor', 'number-flow'] },
  { name: "dev", matches: ["tweakpane"] },
  { name: "setting-base", matches: ["@yudiel/react-qr-scanner"] },
  { name: "captcha", matches: ["@better-captcha"] },
  { name: "ui-zagjs", matches: ["@zag-js"] }
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd()) as ImportMetaEnv;
  const host = env.VITE_APP_HOST ?? "0.0.0.0"
  const port = Number(env.VITE_APP_PORT)

  const stage = process.env["STAGE"] as Stage | undefined
  const target: Partial<StageOpts> = stage ? STAGES[stage] : {};

  let isSSR = false;

  return {
    logLevel: 'info',
    plugins: [
      vike(),
      react(),
      tailwindcss(),
      tsconfigPaths({
        ignoreConfigErrors: true
      }),
      analyzer({
        analyzerMode: "static",
        enabled: target?.pluginOpts?.analyzerIsEnabled ?? false
      }),
      svg({
        inputRoot: 'assets/svg',
        output: 'public/sprites',
        fileName: '{name}.{hash:8}.svg',
        metadata: 'shared/sprite.gen.ts',
        resetColors: false
      }),
      {
        name: "log",
        configResolved(resolvedConfig) {
          isSSR = !!resolvedConfig.build.ssr;
        },
        buildStart() {
          if (!isSSR && process.env.NODE_ENV === 'production') {
            console.log(`Build for stage: ${stage}`, target)
          }
        }
      },
      paraglideVitePlugin({
        project: "./project.inlang",
        outdir: "./paraglide",
        strategy: ["url", "baseLocale"]
      })
    ],
    ssr: {
      noExternal: process.env.NODE_ENV === 'production' || undefined
    },
    build: {
      ...target?.buildOpts,
      emptyOutDir: true,
      target: "esnext",
      rollupOptions: {
        external: [
          '@scure/bip39/wordlists/english.js',
        ],
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (target.buildOpts?.chunkGroping) {
              for (const group of CHUNK_GROUPS) {
                if (group.matches.some(match => id.includes(match))) {
                  return group.name;
                }
              }
            }

            const parts = id.split('node_modules/');
            const pathParts = parts[parts.length - 1].split('/');

            const name = pathParts[0].startsWith('@')
              ? `${pathParts[0]}/${pathParts[1]}`
              : pathParts[0];

            return name.split('@')[0];
          }
        }
      }
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        "@": new URL("./", import.meta.url).pathname,
        '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
        consola: mode === 'production' ? path.resolve(__dirname, './shared/lib/noop.ts') : 'consola',
      },
    },
    preview: {
      host,
      port,
      allowedHosts: true
    },
    server: {
      host,
      port,
      allowedHosts: true
    },
  }
});