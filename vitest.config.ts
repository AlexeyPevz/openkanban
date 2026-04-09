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
      "@openkanban/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@openkanban/core/resources/normalize": resolve(__dirname, "packages/core/src/resources/normalize.ts"),
      "@openkanban/core/resources/types": resolve(__dirname, "packages/core/src/resources/types.ts"),
      '@openkanban/sidecar': resolve(__dirname, 'packages/sidecar/src/index.ts'),
      "@openkanban/plugin": resolve(__dirname, "packages/plugin/src/plugin.ts"),
    },
  },
})
