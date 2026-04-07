import { describe, expect, it, vi } from "vitest"

// Test the create-task handler logic (not the plugin tool wrapper)
import { makeCreateTaskHandler } from "../../../../packages/plugin/src/tools/create-task.js"

describe("kanban_create_task handler", () => {
  it("creates a task with title and defaults", async () => {
    const mockRepo = {
      createTask: vi.fn().mockResolvedValue({
        id: "fix-login-bug",
        title: "Fix login bug",
        status: "planned",
        source_file: ".tasks/tasks/fix-login-bug.md",
        updated_at: "2026-04-07T00:00:00.000Z",
      }),
    }

    const handler = makeCreateTaskHandler(mockRepo as never)
    const result = await handler({ title: "Fix login bug" })

    expect(result).toContain("fix-login-bug")
    expect(mockRepo.createTask).toHaveBeenCalledOnce()
  })

  it("creates a task with explicit status and priority", async () => {
    const mockRepo = {
      createTask: vi.fn().mockResolvedValue({
        id: "add-tests",
        title: "Add tests",
        status: "active",
        source_file: ".tasks/tasks/add-tests.md",
        updated_at: "2026-04-07T00:00:00.000Z",
        priority: "high",
      }),
      writeTaskMetadata: vi.fn().mockResolvedValue(undefined),
    }

    const handler = makeCreateTaskHandler(mockRepo as never)
    const result = await handler({ title: "Add tests", status: "active", priority: "high" })

    expect(result).toContain("add-tests")
  })
})
