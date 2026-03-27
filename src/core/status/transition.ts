import type { TaskStatus, TransitionResult } from "../types.js"

const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  planned: ["active", "parked", "cancelled"],
  active: ["review", "blocked"],
  blocked: ["active"],
  review: ["done", "blocked"],
  done: [],
  parked: [],
  cancelled: [],
}

export function canTransition(from: TaskStatus, to: TaskStatus): TransitionResult {
  const allowed = ALLOWED_TRANSITIONS[from] ?? []
  if (allowed.includes(to)) {
    return {
      ok: true,
      nextStatus: to,
    }
  }

  return {
    ok: false,
    reason: `Transition ${from} -> ${to} is not allowed`,
  }
}
