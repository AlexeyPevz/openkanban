#!/usr/bin/env node
/**
 * Bundle @openkanban/plugin into a single ESM file for OpenCode.
 *
 * - Inlines @openkanban/core (local workspace dep)
 * - Keeps @opencode-ai/plugin as external (provided by host runtime)
 * - Keeps node built-ins as external
 * - Output: packages/plugin/dist/openkanban.plugin.mjs
 */
import { build } from "esbuild"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

await build({
  entryPoints: [resolve(root, "packages/plugin/src/plugin.ts")],
  outfile: resolve(root, "packages/plugin/dist/openkanban.plugin.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  external: ["@opencode-ai/plugin"],
  // Resolve workspace packages via tsconfig paths
  alias: {
    "@openkanban/core": resolve(root, "packages/core/src/index.ts"),
  },
  sourcemap: false,
  minify: false, // keep readable for debugging
  banner: {
    js: "// @openkanban/plugin — bundled for OpenCode\n// https://github.com/AlexeyPevz/openkanban\n",
  },
})

console.log("✅ Bundle created: packages/plugin/dist/openkanban.plugin.mjs")
