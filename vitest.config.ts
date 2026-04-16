import { defineConfig } from "vitest/config"
import { resolve } from "node:path"
import { svelte } from "@sveltejs/vite-plugin-svelte"

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Vitest runtime supports environmentMatchGlobs here; current TS types lag behind.
    // @ts-expect-error environmentMatchGlobs is a valid Vitest option in runtime.
    environmentMatchGlobs: [
      ["tests/ui/**/*.test.ts", "happy-dom"],
      ["**/tests/desktop/stores*.test.ts", "happy-dom"],
      ["**/tests/desktop/project-sidebar.test.ts", "happy-dom"],
    ],
  },
  resolve: {
    conditions: process.env.VITEST ? ['browser'] : [],
    alias: {
      "@openkanban/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@openkanban/core/resources/normalize": resolve(__dirname, "packages/core/src/resources/normalize.ts"),
      "@openkanban/core/resources/types": resolve(__dirname, "packages/core/src/resources/types.ts"),
      '@openkanban/sidecar': resolve(__dirname, 'packages/sidecar/src/index.ts'),
      "@openkanban/plugin": resolve(__dirname, "packages/plugin/src/plugin.ts"),
    },
  },
})
