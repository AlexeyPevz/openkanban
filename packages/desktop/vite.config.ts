import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'esnext',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      // @neon-tiger/core barrel re-exports Node-only repository modules.
      // Desktop talks to sidecar via JSON-RPC, so Node built-ins are never
      // called at runtime in the WebView — mark them as external so Rollup
      // doesn't try to resolve named exports from browser-external stubs.
      external: [
        /^node:/,
        'fs', 'path', 'os', 'stream', 'events', 'util', 'crypto',
      ],
    },
  },
});
