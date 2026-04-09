import { tool } from "@opencode-ai/plugin"
import type { TaskRepository } from "@openkanban/core"

export function makeGetTaskHandler(taskRepository: TaskRepository) {
  return async (args: { taskId: string }): Promise<string> => {
    const task = await taskRepository.loadTaskById(args.taskId)
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`)
    }
    return JSON.stringify(task, null, 2)
  }
}

export function getTaskTool(taskRepository: TaskRepository) {
  return tool({
    description: "Get detailed information about a kanban task",
    args: {
      taskId: tool.schema.string().min(1).describe("Task ID"),
    },
    async execute(args, context) {
      const handler = makeGetTaskHandler(taskRepository)
      const result = await handler(args)
      context.metadata({ title: `Task ${args.taskId} loaded` })
      return result
    },
  })
}
