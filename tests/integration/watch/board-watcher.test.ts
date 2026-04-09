import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createBoardWatcher } from "@openkanban/core"

describe("watch/board-watcher", () => {
  let rootDir: string
  let taskFile: string

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "kanban-board-watcher-"))
    const tasksDir = join(rootDir, ".tasks", "tasks")
    await mkdir(tasksDir, { recursive: true })
    taskFile = join(tasksDir, "task-001.md")
    await writeFile(taskFile, "---\nid: task-001\ntitle: Test\nstatus: planned\n---\n", "utf8")
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it("refreshes board state when a task file changes", async () => {
    const refresh = vi.fn()
    const watcher = createBoardWatcher({
      rootDir,
      patterns: [".tasks/tasks/*.md"],
      onRefresh: refresh,
    })

    await new Promise<void>((resolve) => {
      watcher.on("ready", () => resolve())
    })

    await writeFile(taskFile, "---\nid: task-001\ntitle: Updated\nstatus: active\n---\n", "utf8")

    await vi.waitFor(() => {
      expect(refresh).toHaveBeenCalled()
    })

    await watcher.close()
  })
})
