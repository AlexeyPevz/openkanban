/**
 * Browser-safe UI helper functions.
 *
 * These functions operate on plain data (TaskCard) and have ZERO Node.js
 * built-in dependencies. They were extracted from board-store.ts so that
 * browser runtimes (e.g. Tauri WebView) can import them without pulling
 * in Node-only repository modules.
 */
import type { TaskCard } from "../types.js"
import type { ResourceAssignment } from "../resources/types.js"
import { normalizeResources } from "../resources/normalize.js"

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
