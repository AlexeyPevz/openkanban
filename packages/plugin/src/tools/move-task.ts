import { tool } from "@opencode-ai/plugin"
import type { TaskRepository, TaskStatus, RuntimePublisher } from "@openkanban/core"
import {
  loadBoardWithDiagnostics,
  createTaskEvent,
  publishTaskEvent,
  updateTaskStatus,
} from "@openkanban/core"

export interface MoveTaskDeps {
  directory: string
  taskRepository: TaskRepository
  runtimePublisher: RuntimePublisher
  publishedEventIds: Set<string>
}

export function moveTaskTool(deps: MoveTaskDeps) {
  return tool({
    description: "Move a kanban task to a new status using project task files",
    args: {
      taskId: tool.schema.string().min(1),
      targetStatus: tool.schema.enum([
        "planned", "active", "review", "done", "blocked", "parked", "cancelled",
      ]),
    },
    async execute(args, context) {
      const task = await deps.taskRepository.loadTaskById(args.taskId)
      if (!task) {
        throw new Error(`Task not found: ${args.taskId}`)
      }

      const updatedTask = await updateTaskStatus(deps.taskRepository, args.taskId, {
        from: task.status,
        to: args.targetStatus as TaskStatus,
      })

      const event = createTaskEvent({
        task: updatedTask,
        from: task.status,
        to: updatedTask.status,
        initiator: "agent",
        correlationId: `${updatedTask.id}:${Date.now()}`,
        preflightResult: updatedTask.status === "blocked" ? "failed" : "passed",
      })

      await publishTaskEvent({
        runtimePublisher: deps.runtimePublisher,
        event,
        publishedEventIds: deps.publishedEventIds,
      })

      context.metadata({
        title: `Kanban task moved to ${updatedTask.status}`,
        metadata: { taskId: updatedTask.id, status: updatedTask.status },
      })

      return JSON.stringify(updatedTask, null, 2)
    },
  })
}
