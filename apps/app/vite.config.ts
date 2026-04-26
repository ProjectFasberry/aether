import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vike from "vike/plugin";
import { analyzer } from 'vite-bundle-analyzer';
import svg from '@neodx/svg/vite';
import tsconfigPaths from 'vite-tsconfig-paths'

type Stage = "dev" | "prod" | "staging"
const STAGES: Partial<Record<Stage, { sourcemap: boolean }>> = {
  "dev": {
    sourcemap: true
  },
  "staging": {
    sourcemap: true
  }
}

export default defineConfig(({ mode }) => {
  const stage = process.env.STAGE as Stage | undefined
  console.log(`Build for stage: ${stage}`)

  const env = loadEnv(mode, process.cwd()) as ImportMetaEnv;
  const host = env.VITE_APP_HOST
  const port = Number(env.VITE_APP_PORT)

  let sourcemap = false;

  if (stage) {
    const target = STAGES[stage];
    
    if (target) {
      sourcemap = target.sourcemap;
    }
  }

  return {
    plugins: [
      vike(),
      react(),
      tailwindcss(),
      tsconfigPaths(),
      analyzer({ 
        enabled: true, 
        analyzerMode: "static", 
      }),
      svg({
        inputRoot: 'assets/svg',
        output: 'public/sprites',
        fileName: '{name}.{hash:8}.svg',
        metadata: 'shared/sprite.gen.ts',
        resetColors: false
      })
    ],
    ssr: {
      noExternal: process.env.NODE_ENV === 'production' ? true : undefined
    },
    build: {
      target: "esnext",
      sourcemap
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        "@": new URL("./", import.meta.url).pathname,
        '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs'
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