import { type Plugin } from "@opencode-ai/plugin"
import {
  BoardYamlRepository,
  TaskMarkdownRepository,
  type RuntimePublisher,
} from "@neon-tiger/core"

import { createOpenCodeAdapter } from "./host/adapter.js"
import { probeCapabilities } from "./host/probe-capabilities.js"

import { loadBoardTool } from "./tools/load-board.js"
import { moveTaskTool } from "./tools/move-task.js"
import { createTaskTool } from "./tools/create-task.js"
import { getTaskTool } from "./tools/get-task.js"
import { listTasksTool } from "./tools/list-tasks.js"
import { openBoardTool, type OpenBoardDeps } from "./tools/open-board.js"

import { existsSync, readFileSync } from "node:fs"
import { spawn } from "node:child_process"
import { join, resolve } from "node:path"
import { homedir } from "node:os"

function resolveBinaryPath(): string | null {
  // 1. Check PATH (platform-dependent)
  // For now, check well-known locations
  const home = homedir()
  const candidates = [
    join(home, ".openkanban", "bin", "openkanban-desktop"),
    join(home, ".openkanban", "bin", "openkanban-desktop.exe"),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

function isLockActive(directory: string): boolean {
  const lockPath = join(directory, ".tasks", ".board-ui.lock")
  if (!existsSync(lockPath)) return false
  try {
    const content = readFileSync(lockPath, "utf-8").trim()
    const pid = parseInt(content, 10)
    if (isNaN(pid)) return false
    // Check if process is still running
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  } catch {
    return false
  }
}

export const plugin: Plugin = async (input) => {
  const directory = input.directory
  const taskRepository = new TaskMarkdownRepository(directory)
  const publishedEventIds = new Set<string>()
  const runtimePublisher: RuntimePublisher = {
    publish: async () => {
      // Current execution environment has no verified live runtime bridge.
    },
  }

  const matrix = await probeCapabilities({
    pluginExports: Object.keys(await import("@opencode-ai/plugin")).sort(),
    liveHostAvailable: false,
  })

  const openBoardDeps: OpenBoardDeps = {
    directory,
    isLockActive: async () => isLockActive(directory),
    resolveBinary: async () => resolveBinaryPath(),
    spawnDetached: (binary, args) => {
      const child = spawn(binary, args, { detached: true, stdio: "ignore" })
      child.unref()
    },
  }

  return {
    event: async () => {},
    tool: {
      kanban_load_board: loadBoardTool(directory),
      kanban_move_task: moveTaskTool({ directory, taskRepository, runtimePublisher, publishedEventIds }),
      kanban_create_task: createTaskTool(taskRepository),
      kanban_get_task: getTaskTool(taskRepository),
      kanban_list_tasks: listTasksTool(taskRepository),
      kanban_open_board: openBoardTool(openBoardDeps),
    },
  }
}
