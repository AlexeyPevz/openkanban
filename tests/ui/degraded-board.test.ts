import { Window } from "happy-dom"
import { describe, expect, it } from "vitest"

import type { Board } from "../../src/repository/contracts"
import type { BoardViewState } from "../../src/ui/state/board-store"
import { renderBoard } from "../../src/ui/view/render-board"

const board: Board = {
  id: "degraded-board",
  title: "Degraded Board",
  columns: [{ id: "planned", title: "Planned" }],
  agent_registry: { local: [], host: [], ad_hoc: [] },
}

function createRoot() {
  return new Window().document.createElement("div")
}

describe("renderBoard degraded diagnostics", () => {
  it("renders degraded diagnostics instead of crashing the whole board", () => {
    const root = createRoot()
    const degradedState: BoardViewState = {
      state: "success",
      board,
      tasks: [],
      diagnostics: [
        {
          severity: "warning",
          source: ".tasks/tasks/task-broken.md",
          message: "Failed to parse broken task",
        },
      ],
    }

    renderBoard(root, degradedState)

    expect(root.textContent).toContain("warning")
    expect(root.textContent).toContain("Failed to parse broken task")
  })
})
