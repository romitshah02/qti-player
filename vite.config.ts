import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ESM; derive it from import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Mode-aware config:
 * - development (`vite` / `npm run dev`): dev server + API proxy for the dev
 *   harness; no `lib` build.
 * - library / web-component (`vite build`): single IIFE bundle + single CSS
 *   file from the dedicated web-component entry (NOT main.tsx).
 */
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // qti3-stimulus-player compiles raw QTI markup into a Vue template
        // AT RUNTIME (`<component :is="processedXml">`), which needs the
        // compiler-included Vue build — Vite's default `vue` resolution is
        // runtime-only (no compileToFunctions). vue-cli-service's
        // `runtimeCompiler: true` option did this same aliasing for the old
        // Vue app; Vite has no equivalent flag, so alias it directly.
        vue: 'vue/dist/vue.esm.js',
      },
      // qti3-stimulus-player is a UMD/CJS Vue 2 bundle that globally
      // registers a child component via `Vue.component('catalog-dialog', ...)`
      // as a module-load side effect (see services/stimulus-player-mount.ts).
      // Without forcing a single deduped `vue` instance, Vite's dep
      // optimizer can end up giving that package's internal `require('vue')`
      // a different Vue module copy than the one this app imports directly —
      // the registration lands on a global registry our own
      // Vue.extend()-created instances never see, so `$refs.catalogdialog`
      // resolves to an unregistered (plain-DOM) element instead of the real
      // component, and its `.reset()`/etc. methods are missing.
      dedupe: ['vue'],
    },
    optimizeDeps: {
      include: ['vue', 'qti3-stimulus-player'],
    },

    // The IIFE web-component bundle runs in the browser, which has no
    // `process`. React branches on `process.env.NODE_ENV`; Vite does not
    // inline it in library mode, so without this the bundle throws
    // "process is not defined" at load. Only for the build — in dev, Vite
    // manages NODE_ENV itself for HMR/React dev mode.
    define: isBuild
      ? { 'process.env.NODE_ENV': JSON.stringify('production') }
      : {},

    // ── Development mode (vite / npm run dev) ──────────────────────────────
    server: {
      // vue-cli-service's default dev port. The blob-storage CORS error is
      // coming straight from devstoreaccount1.localhost (Azurite), not from
      // our own dev-server proxy — that origin's CORS allowlist most likely
      // only names the Vue app's port (8080), not Vite's default (5173/3000).
      // Matching it is the cheap fix; if it's still blocked, the allowlist
      // itself needs updating on the Azurite/gateway side.
      port: 8080,
      proxy: {
        // Same local knowledge-platform backend on 9000, telemetry-service
        // on 9001 used by the dev harness.
        '/content': { target: 'http://localhost:9000', changeOrigin: true },
        '/action/data/v3/telemetry': {
          target: 'http://localhost:9001',
          changeOrigin: true,
          rewrite: (p: string) => p.replace('/action/data/v3/telemetry', '/v1/telemetry'),
        },
      },
    },

    // ── Library / web-component mode (vite build) ───────────────────────────
    build: isBuild
      ? {
          outDir: 'dist',
          sourcemap: false,
          lib: {
            entry: 'src/web-component/element-registration.tsx',
            name: 'Qti3TestRunner',
            fileName: () => 'qti3-test-runner.js',
            formats: ['iife'],
          },
          minify: 'terser',
          cssCodeSplit: false,
        }
      : {
          outDir: 'dist',
          sourcemap: true,
        },
  };
});