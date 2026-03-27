import { enforceKanbanContract } from "../../core/contract/enforce-kanban.js"
import { runPreflight } from "../../core/preflight/run-preflight.js"
import { canTransition } from "../../core/status/transition.js"
import type { GateResult, TaskCard, TaskStatus } from "../../core/types.js"
import type { StatusWriteInput } from "../../repository/contracts.js"

export interface HandleDropInput {
  task: TaskCard
  targetStatus: TaskStatus
  availableAgents?: string[]
  availableSkills?: string[]
  gateResults?: GateResult[]
  updateTaskStatus: (id: string, input: StatusWriteInput) => Promise<TaskCard>
}

export async function handleDrop(input: HandleDropInput): Promise<TaskCard> {
  const transition = canTransition(input.task.status, input.targetStatus)
  if (!transition.ok) {
    throw new Error(transition.reason ?? `Transition ${input.task.status} -> ${input.targetStatus} is not allowed`)
  }

  const preflight = runPreflight({
    task: input.task,
    targetStatus: input.targetStatus,
    availableAgents: input.availableAgents,
    availableSkills: input.availableSkills,
    gateResults: input.gateResults,
  })

  const contract = preflight.ok
    ? enforceKanbanContract({
        task: input.task,
        targetStatus: input.targetStatus,
      })
    : null

  const nextStatus = !preflight.ok ? "blocked" : contract && !contract.ok ? contract.nextStatus : input.targetStatus
  const blockedReason = preflight.reason ?? contract?.reason

  return input.updateTaskStatus(input.task.id, {
    from: input.task.status,
    to: nextStatus,
    blocked_reason: blockedReason,
  })
}

export function attachTaskDropTarget(
  element: { addEventListener(type: string, listener: (event: unknown) => void): void },
  buildInput: () => HandleDropInput,
): void {
  element.addEventListener("dragover", (event) => {
    ;(event as { preventDefault?: () => void }).preventDefault?.()
  })

  element.addEventListener("drop", async (event) => {
    ;(event as { preventDefault?: () => void }).preventDefault?.()
    await handleDrop(buildInput())
  })
}
