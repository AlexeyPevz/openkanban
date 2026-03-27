import { tool, type Plugin } from "@opencode-ai/plugin"

import type { TaskCard, TaskStatus } from "./core/types.js"
import { createTaskEvent } from "./core/events/task-event.js"
import { BoardYamlRepository } from "./repository/canonical/board-yaml-repository.js"
import { TaskMarkdownRepository } from "./repository/canonical/task-markdown-repository.js"
import { updateTaskStatus as persistTaskStatus } from "./repository/write/update-task-status.js"
import { createTask as persistCreateTask } from "./repository/write/create-task.js"
import { updateTask as persistUpdateTask } from "./repository/write/update-task.js"
import { publishTaskEvent } from "./bridge/orchestrator/publish-task-event.js"
import type { RuntimePublisher } from "./bridge/orchestrator/runtime-publisher.js"
import { createOpenCodeAdapter, type OpenCodeAdapter } from "./host/opencode/adapter.js"
import { probeCapabilities } from "./host/opencode/probe-capabilities.js"
import { loadBoardWithDiagnostics } from "./ui/state/board-store.js"
import { renderBoard } from "./ui/view/render-board.js"
import { renderTaskForm } from "./ui/view/render-task-form.js"
import { attachTaskDropTarget, handleDrop } from "./ui/interactions/drag-drop.js"
import { attachKeyboardShortcuts } from "./ui/interactions/keyboard-shortcuts.js"
import { attachDetailsPanel } from "./ui/interactions/details-panel.js"
import { attachTaskFormSubmit } from "./ui/interactions/task-form.js"

export interface CreatePluginAppInput {
  directory: string
  adapter?: OpenCodeAdapter
  runtimePublisher?: RuntimePublisher
}

export interface PluginApp {
  loadBoard(): ReturnType<typeof loadBoardWithDiagnostics>
  moveTask(taskId: string, targetStatus: TaskStatus): Promise<TaskCard>
  mountBoard(root: HTMLElement): Promise<void>
}

function getAvailableAgents(board: Awaited<ReturnType<typeof loadBoardWithDiagnostics>>["board"]): string[] {
  return [
    ...board.agent_registry.local,
    ...board.agent_registry.host,
    ...board.agent_registry.ad_hoc,
  ].map((agent) => agent.id)
}

export async function createPluginApp(input: CreatePluginAppInput): Promise<PluginApp> {
  const boardRepository = new BoardYamlRepository(input.directory)
  const taskRepository = new TaskMarkdownRepository(input.directory)
  const publishedEventIds = new Set<string>()
  const runtimePublisher = input.runtimePublisher ?? {
    publish: async () => {},
  }

  const app: PluginApp = {
    async loadBoard() {
      return loadBoardWithDiagnostics(input.directory)
    },

    async moveTask(taskId: string, targetStatus: TaskStatus) {
      const boardState = await loadBoardWithDiagnostics(input.directory)
      const task = await taskRepository.loadTaskById(taskId)

      if (!task) {
        throw new Error(`Task not found: ${taskId}`)
      }

      const updatedTask = await handleDrop({
        task,
        targetStatus,
        availableAgents: getAvailableAgents(boardState.board),
        availableSkills: [],
        gateResults: [],
        updateTaskStatus: (id, statusInput) => persistTaskStatus(taskRepository, id, statusInput),
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
        runtimePublisher,
        event,
        publishedEventIds,
      })

      return updatedTask
    },

    async mountBoard(root: HTMLElement) {
      const boardState = await loadBoardWithDiagnostics(input.directory)
      renderBoard(root as never, boardState)

      attachKeyboardShortcuts(root as never, async (action) => {
        if (action === "manual-rescan") {
          input.adapter?.rescanBoard()
          await app.mountBoard(root)
        }
        if (action === "open-details") {
          input.adapter?.openSelectedTaskDetails()
        }
        if (action === "focus-next-card" || action === "focus-previous-card") {
          input.adapter?.openBoard()
        }
      })

      attachDetailsPanel(root as never, boardState.tasks)

      let draggedTaskId: string | null = null
      root.querySelectorAll<HTMLElement>("[data-task-id]").forEach((card) => {
        card.addEventListener("dragstart", () => {
          draggedTaskId = card.getAttribute("data-task-id")
        })
      })

      root.querySelectorAll<HTMLElement>("[data-column-id]").forEach((column) => {
        attachTaskDropTarget(column, () => {
          const task = boardState.tasks.find((item) => item.id === draggedTaskId)
          if (!task) {
            throw new Error("No dragged task selected")
          }

          return {
            task,
            targetStatus: column.getAttribute("data-column-id") as TaskStatus,
            availableAgents: getAvailableAgents(boardState.board),
            availableSkills: [],
            gateResults: [],
            updateTaskStatus: (id, statusInput) => persistTaskStatus(taskRepository, id, statusInput),
          }
        })
      })

      const form = renderTaskForm(root.ownerDocument ?? document, { status: "planned" })
      attachTaskFormSubmit({
        form,
        createTask: (taskInput) => persistCreateTask(taskRepository, taskInput),
        updateTask: (taskId, patch) => persistUpdateTask(taskRepository, taskId, patch),
      })

      root.appendChild(form)
    },
  }

  return app
}

export const plugin: Plugin = async (input) => {
  const matrix = await probeCapabilities({
    pluginExports: Object.keys(await import("@opencode-ai/plugin")).sort(),
    liveHostAvailable: false,
  })
  const adapter = createOpenCodeAdapter(matrix)
  const app = await createPluginApp({
    directory: input.directory,
    adapter,
    runtimePublisher: {
      publish: async () => {
        // Current execution environment has no verified live runtime bridge.
      },
    },
  })

  return {
    event: async () => {},
    tool: {
      kanban_load_board: tool({
        description: "Load current kanban board state from canonical task files",
        args: {},
        async execute(_args, context) {
          const boardState = await app.loadBoard()
          context.metadata({
            title: "Kanban board loaded",
            metadata: {
              state: boardState.state,
              taskCount: boardState.state === "success" ? boardState.tasks.length : 0,
            },
          })

          return JSON.stringify(boardState, null, 2)
        },
      }),
      kanban_move_task: tool({
        description: "Move a kanban task to a new status using project task files",
        args: {
          taskId: tool.schema.string().min(1),
          targetStatus: tool.schema.enum(["planned", "active", "review", "done", "blocked", "parked", "cancelled"]),
        },
        async execute(args, context) {
          const updatedTask = await app.moveTask(args.taskId, args.targetStatus)
          context.metadata({
            title: `Kanban task moved to ${updatedTask.status}`,
            metadata: {
              taskId: updatedTask.id,
              status: updatedTask.status,
              preferredBoardSurface: adapter.preferredBoardSurface,
              supportsRuntimeEvents: adapter.supportsRuntimeEvents,
            },
          })

          return JSON.stringify(updatedTask, null, 2)
        },
      }),
    },
  }
}
