import { tool } from "@opencode-ai/plugin"
import type { TaskRepository, TaskStatus, TaskCard } from "@openkanban/core"

export interface ListTasksFilter {
  status?: TaskStatus
  priority?: "low" | "medium" | "high"
  assignee?: string
}

export function makeListTasksHandler(taskRepository: TaskRepository) {
  return async (filter: ListTasksFilter): Promise<string> => {
    let tasks = await taskRepository.loadTasks()

    if (filter.status) {
      tasks = tasks.filter((t: TaskCard) => t.status === filter.status)
    }
    if (filter.priority) {
      tasks = tasks.filter((t: TaskCard) => t.priority === filter.priority)
    }
    if (filter.assignee) {
      tasks = tasks.filter((t: TaskCard) => t.assignees?.includes(filter.assignee!))
    }

    return JSON.stringify(tasks, null, 2)
  }
}

export function listTasksTool(taskRepository: TaskRepository) {
  return tool({
    description: "List kanban tasks with optional filters",
    args: {
      status: tool.schema
        .enum(["planned", "active", "review", "done", "blocked", "parked", "cancelled"])
        .optional()
        .describe("Filter by status"),
      priority: tool.schema.enum(["low", "medium", "high"]).optional().describe("Filter by priority"),
      assignee: tool.schema.string().optional().describe("Filter by assignee"),
    },
    async execute(args, context) {
      const handler = makeListTasksHandler(taskRepository)
      const result = await handler(args)
      const parsed = JSON.parse(result)
      context.metadata({ title: `Listed ${parsed.length} tasks` })
      return result
    },
  })
}
