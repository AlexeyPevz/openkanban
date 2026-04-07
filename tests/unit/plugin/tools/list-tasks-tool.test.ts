import { describe, expect, it, vi } from "vitest"
import { makeListTasksHandler } from "../../../../packages/plugin/src/tools/list-tasks.js"

const tasks = [
  { id: "t1", title: "A", status: "active", priority: "high", assignees: ["alice"], source_file: "f", updated_at: "t" },
  { id: "t2", title: "B", status: "done", priority: "low", assignees: ["bob"], source_file: "f", updated_at: "t" },
  { id: "t3", title: "C", status: "active", priority: "medium", assignees: [], source_file: "f", updated_at: "t" },
]

describe("kanban_list_tasks handler", () => {
  it("returns all tasks when no filters", async () => {
    const mockRepo = { loadTasks: vi.fn().mockResolvedValue(tasks) }
    const handler = makeListTasksHandler(mockRepo as never)
    const result = JSON.parse(await handler({}))
    expect(result).toHaveLength(3)
  })

  it("filters by status", async () => {
    const mockRepo = { loadTasks: vi.fn().mockResolvedValue(tasks) }
    const handler = makeListTasksHandler(mockRepo as never)
    const result = JSON.parse(await handler({ status: "active" }))
    expect(result).toHaveLength(2)
    expect(result.every((t: { status: string }) => t.status === "active")).toBe(true)
  })

  it("filters by priority", async () => {
    const mockRepo = { loadTasks: vi.fn().mockResolvedValue(tasks) }
    const handler = makeListTasksHandler(mockRepo as never)
    const result = JSON.parse(await handler({ priority: "high" }))
    expect(result).toHaveLength(1)
  })
})
