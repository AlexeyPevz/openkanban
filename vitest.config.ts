import { defineConfig } from "vitest/config"
import { resolve } from "node:path"
import { svelte } from "@sveltejs/vite-plugin-svelte"

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    environmentMatchGlobs: [
      ["tests/ui/**/*.test.ts", "happy-dom"],
      ["**/tests/desktop/stores*.test.ts", "happy-dom"],
    ],
  },
  resolve: {
    alias: {
      "@neon-tiger/core": resolve(__dirname, "packages/core/src/index.ts"),
      '@neon-tiger/sidecar': resolve(__dirname, 'packages/sidecar/src/index.ts'),
      "@neon-tiger/plugin": resolve(__dirname, "packages/plugin/src/plugin.ts"),
    },
  },
})
