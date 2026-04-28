import { BuildEnvironmentOptions, defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vike from "vike/plugin";
import { analyzer } from 'vite-bundle-analyzer';
import svg from '@neodx/svg/vite';
import tsconfigPaths from 'vite-tsconfig-paths'
import path from "node:path"

type Stage = "staging" | "prod"

type StagePluginOpts = {
  analyzerIsEnabled?: boolean
}

type StageOpts = {
  buildOpts: BuildEnvironmentOptions,
  pluginOpts: Partial<StagePluginOpts>
}

const STAGES: Record<Stage, StageOpts> = {
  "staging": {
    buildOpts: {
      sourcemap: true,
      minify: "esbuild"
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
      tsconfigPaths(),
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
          if (!isSSR) {
            console.log(`Build for stage: ${stage}`, target)
          }
        }
      }
    ],
    ssr: {
      noExternal: process.env.NODE_ENV === 'production' || undefined
    },
    build: {
      ...target?.buildOpts,
      emptyOutDir: true,
      target: "esnext",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return id.toString().split('node_modules/')[1].split('/')[0].toString();
            }
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