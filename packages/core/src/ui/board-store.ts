import type { TaskCard } from "../types.js"
import type { Board } from "../repository/contracts.js"
import type { ResourceAssignment } from "../resources/types.js"
import { normalizeResources } from "../resources/normalize.js"
import { BoardYamlRepository } from "../repository/canonical/board-yaml-repository.js"
import {
  loadCanonicalTasksWithDiagnostics,
  type TaskRepositoryDiagnostic,
} from "../repository/canonical/task-markdown-repository.js"

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

export function getTasksForColumn(tasks: TaskCard[], columnId: string): TaskCard[] {
  return tasks.filter((task) => task.status === columnId)
}

export function getTaskAgents(task: TaskCard): string[] {
  const requiredAgents = task.required_agents?.filter(Boolean) ?? []

  if (requiredAgents.length > 0) {
    return requiredAgents
  }

  return task.assignees?.filter(Boolean) ?? []
}

export function hasTaskBlocker(task: TaskCard): boolean {
  return task.status === "blocked" || typeof task.blocked_reason === "string"
}

export function getTaskResources(task: TaskCard): ResourceAssignment[] {
  return normalizeResources(
    task.resources,
    task.required_agents,
    task.required_skills,
  )
}
