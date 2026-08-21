import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ESM; derive it from import.meta.url. A
// separate config file from vite.config.ts — nothing is inherited, so the
// `@` alias has to be redeclared here too.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Builds the ./config export — content-node -> RunnerConfig utilities,
 * consumed as a plain ESM module (not the web-component bundle). Separate
 * config from vite.config.ts because Vite's build.lib can't mix formats
 * (the web-component build needs `iife`, this needs `es`) in one config.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [dts({ include: ['src'], outDir: 'dist-lib', rollupTypes: true })],
  build: {
    outDir: 'dist-lib',
    lib: {
      entry: 'src/config/index.ts',
      fileName: () => 'index.js',
      formats: ['es'],
    },
  },
});