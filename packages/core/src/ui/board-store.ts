import type { TaskCard } from "../types.js"
import type { Board } from "../repository/contracts.js"
import { BoardYamlRepository } from "../repository/canonical/board-yaml-repository.js"
import {
  loadCanonicalTasksWithDiagnostics,
  type TaskRepositoryDiagnostic,
} from "../repository/canonical/task-markdown-repository.js"

// Re-export browser-safe helpers for backward compatibility.
// New browser consumers should import from "@openkanban/core/browser" or
// directly from "./task-helpers.js" to avoid pulling Node-only deps.
export { getTasksForColumn, getTaskAgents, hasTaskBlocker, getTaskResources } from "./task-helpers.js"

export interface BoardDiagnostic extends TaskRepositoryDiagnostic {}

export type BoardViewState =
  | { state: "loading" }
  | { state: "empty"; message: string }
  | { state: "error"; message: string }
  | { state: "success"; board: Board; tasks: TaskCard[]; diagnostics?: BoardDiagnostic[] }

export async function loadBoardWithDiagnostics(rootDir: string): Promise<Extract<BoardViewState, { state: "success" }>> {
  const boardRepository = new BoardYamlRepository(rootDir)
  const board = await boardRepository.loadBoard()
  const { tasks, diagnostics } = await loadCanonicalTasksWithDiagnostics(rootDir)

  return {
    state: "success",
    board,
    tasks,
    diagnostics,
  }
}
