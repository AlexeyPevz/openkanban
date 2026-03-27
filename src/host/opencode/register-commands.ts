import type { OpenCodeAdapter } from "./adapter.js"

export function registerBoardCommands(adapter: OpenCodeAdapter) {
  return {
    openBoard: { id: "kanban.openBoard", run: () => adapter.openBoard() },
    closeBoard: { id: "kanban.closeBoard", run: () => adapter.closeBoard() },
    manualRescan: { id: "kanban.manualRescan", run: () => adapter.rescanBoard() },
  }
}
