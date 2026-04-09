import { describe, expect, it } from "vitest"

import { TaskStatusSchema, enforceKanbanContract, canTransition } from "@openkanban/core"

const baseTask = {
  id: "task-001",
  title: "Ship MVP",
  status: "active" as const,
  source_file: ".tasks/tasks/task-001.md",
  updated_at: "2026-03-26T00:00:00Z",
}

describe("core/status transition + kanban contract", () => {
  it("includes canonical status model", () => {
    expect(TaskStatusSchema.options).toEqual([
      "planned",
      "active",
      "review",
      "done",
      "blocked",
      "parked",
      "cancelled",
    ])
  })

  it("rejects active to done direct transition", () => {
    expect(canTransition("active", "done")).toEqual({
      ok: false,
      reason: expect.stringMatching(/active.+done/i),
    })
  })

  it("blocks active to review when artifacts missing", () => {
    const result = enforceKanbanContract({
      task: {
        ...baseTask,
        artifacts: [],
      },
      targetStatus: "review",
      actorMode: "orchestrator",
    })

    expect(result.ok).toBe(false)
    expect(result.nextStatus).toBe("blocked")
    expect(result.reason).toMatch(/evidence|artifact/i)
  })

  it("blocks any transition to review when artifacts missing", () => {
    const result = enforceKanbanContract({
      task: {
        ...baseTask,
        status: "planned",
        artifacts: [],
      },
      targetStatus: "review",
      actorMode: "orchestrator",
    })

    expect(result.ok).toBe(false)
    expect(result.nextStatus).toBe("blocked")
    expect(result.reason).toMatch(/evidence|artifact/i)
  })

  it("marks side-channel execution as exception", () => {
    const result = enforceKanbanContract({
      task: {
        ...baseTask,
        status: "planned",
      },
      targetStatus: "active",
      executionMode: "side-channel",
      actorMode: "single-agent",
    })

    expect(result.ok).toBe(true)
    expect(result.exception).toBe(true)
    expect(result.patch.metadata?.execution_exception).toBe("side-channel")
  })

  it("parity orchestrator vs single-agent contract", () => {
    const taskWithEvidence = {
      ...baseTask,
      artifacts: ["docs/evidence/run-001.md"],
    }

    const orchestratorResult = enforceKanbanContract({
      task: taskWithEvidence,
      targetStatus: "review",
      actorMode: "orchestrator",
    })

    const singleAgentResult = enforceKanbanContract({
      task: taskWithEvidence,
      targetStatus: "review",
      actorMode: "single-agent",
    })

    expect(singleAgentResult).toEqual(orchestratorResult)
  })
})
