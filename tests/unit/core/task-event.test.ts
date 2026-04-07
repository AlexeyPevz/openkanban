import { describe, expect, it } from "vitest"

import { TaskEventSchema, createTaskEvent } from "@neon-tiger/core"

describe("core/task-event", () => {
  it("event payload matches expected shape", () => {
    const payload = createTaskEvent({
      task: {
        id: "task-004",
        title: "Investigate",
        status: "planned",
        source_file: ".tasks/tasks/task-004.md",
        updated_at: "2026-03-26T00:00:00Z",
      },
      from: "planned",
      to: "active",
      correlationId: "corr-001",
      initiator: "agent",
      preflightResult: "passed",
      now: () => "2026-03-26T01:00:00Z",
      eventIdFactory: () => "evt-001",
    })

    expect(payload).toEqual({
      event_id: "evt-001",
      correlation_id: "corr-001",
      task_id: "task-004",
      from_status: "planned",
      to_status: "active",
      timestamp: "2026-03-26T01:00:00Z",
      source_file: ".tasks/tasks/task-004.md",
      initiator: "agent",
      preflight_result: "passed",
    })
  })

  it("task event payload validates against schema-first zod contract", () => {
    const payload = createTaskEvent({
      task: {
        id: "task-005",
        title: "Review",
        status: "active",
        source_file: ".tasks/tasks/task-005.md",
        updated_at: "2026-03-26T00:00:00Z",
      },
      from: "active",
      to: "review",
      correlationId: "corr-002",
      initiator: "user",
      preflightResult: "skipped",
      now: () => "2026-03-26T02:00:00Z",
      eventIdFactory: () => "evt-002",
    })

    const parsed = TaskEventSchema.safeParse(payload)
    expect(parsed.success).toBe(true)
  })
})
