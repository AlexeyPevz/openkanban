import type { OpenCodeAdapter } from "./adapter.js"

export function registerBoardHotkeys(adapter: OpenCodeAdapter) {
  return {
    openBoard: { id: "kanban.hotkey.openBoard", run: () => adapter.openBoard() },
    toggleBoard: { id: "kanban.hotkey.toggleBoard", run: () => adapter.toggleBoard() },
    openDetails: { id: "kanban.hotkey.openDetails", run: () => adapter.openSelectedTaskDetails() },
    manualRescan: { id: "kanban.hotkey.manualRescan", run: () => adapter.rescanBoard() },
  }
}
