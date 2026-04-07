import { tool } from "@opencode-ai/plugin"
import { loadBoardWithDiagnostics } from "@neon-tiger/core"

export function loadBoardTool(directory: string) {
  return tool({
    description: "Load current kanban board state from canonical task files",
    args: {},
    async execute(_args, context) {
      const boardState = await loadBoardWithDiagnostics(directory)
      context.metadata({
        title: "Kanban board loaded",
        metadata: {
          state: boardState.state,
          taskCount: boardState.state === "success" ? boardState.tasks.length : 0,
        },
      })
      return JSON.stringify(boardState, null, 2)
    },
  })
}
