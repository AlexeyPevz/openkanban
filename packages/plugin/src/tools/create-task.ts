import { tool } from "@opencode-ai/plugin"
import type { TaskRepository } from "@neon-tiger/core"
import { createTask as coreCreateTask } from "@neon-tiger/core"
import type { TaskStatus } from "@neon-tiger/core"

export interface CreateTaskArgs {
  title: string
  status?: TaskStatus
  priority?: "low" | "medium" | "high"
  assignee?: string
}

export function makeCreateTaskHandler(taskRepository: TaskRepository) {
  return async (args: CreateTaskArgs): Promise<string> => {
    const task = await coreCreateTask(taskRepository, {
      title: args.title,
      status: args.status ?? "planned",
    })

    if (args.priority || args.assignee) {
      await taskRepository.writeTaskMetadata(task.id, {
        metadata: {
          ...(args.priority ? { priority: args.priority } : {}),
          ...(args.assignee ? { assignee: args.assignee } : {}),
        },
      })
    }

    return JSON.stringify(task, null, 2)
  }
}

export function createTaskTool(taskRepository: TaskRepository) {
  return tool({
    description: "Create a new kanban task",
    args: {
      title: tool.schema.string().min(1).describe("Task title"),
      status: tool.schema
        .enum(["planned", "active", "review", "done", "blocked", "parked", "cancelled"])
        .optional()
        .describe("Initial status (default: planned)"),
      priority: tool.schema.enum(["low", "medium", "high"]).optional().describe("Task priority"),
      assignee: tool.schema.string().optional().describe("Assignee"),
    },
    async execute(args, context) {
      const handler = makeCreateTaskHandler(taskRepository)
      const result = await handler(args)
      context.metadata({ title: "Task created" })
      return result
    },
  })
}
