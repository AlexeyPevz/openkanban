import { describe, expect, it, vi } from "vitest"
import { makeGetTaskHandler } from "../../../../packages/plugin/src/tools/get-task.js"

describe("kanban_get_task handler", () => {
  it("returns task by id", async () => {
    const task = {
      id: "task-001",
      title: "Test task",
      status: "active",
      source_file: ".tasks/tasks/task-001.md",
      updated_at: "2026-04-07T00:00:00.000Z",
    }
    const mockRepo = { loadTaskById: vi.fn().mockResolvedValue(task) }
    const handler = makeGetTaskHandler(mockRepo as never)
    const result = await handler({ taskId: "task-001" })
    expect(JSON.parse(result)).toMatchObject({ id: "task-001" })
  })

  it("throws when task not found", async () => {
    const mockRepo = { loadTaskById: vi.fn().mockResolvedValue(null) }
    const handler = makeGetTaskHandler(mockRepo as never)
    await expect(handler({ taskId: "nope" })).rejects.toThrow("Task not found: nope")
  })
})
