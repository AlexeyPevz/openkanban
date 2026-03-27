import chokidar, { type FSWatcher } from "chokidar"
import { join } from "node:path"

export interface CreateBoardWatcherInput {
  rootDir: string
  patterns?: string[]
  onRefresh: () => void | Promise<void>
}

function toWatchTarget(rootDir: string, pattern: string): string {
  const normalizedPattern = pattern.replaceAll("\\", "/")
  const globIndex = normalizedPattern.search(/[*?[\]{}()]/)

  if (globIndex === -1) {
    return join(rootDir, normalizedPattern)
  }

  const prefix = normalizedPattern.slice(0, globIndex)
  const trimmedPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix

  return join(rootDir, trimmedPrefix || ".")
}

export function createBoardWatcher(input: CreateBoardWatcherInput): FSWatcher {
  const rawPatterns = input.patterns ?? [".tasks/tasks/*.md", ".tasks/board.yml"]
  const watchTargets = [...new Set(rawPatterns.map((pattern) => toWatchTarget(input.rootDir, pattern)))]

  const watcher = chokidar.watch(watchTargets, {
    ignoreInitial: true,
  })

  watcher.on("add", input.onRefresh)
  watcher.on("change", input.onRefresh)
  watcher.on("unlink", input.onRefresh)

  return watcher
}
