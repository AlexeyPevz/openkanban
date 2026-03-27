import { Window } from "happy-dom"
import { describe, expect, it } from "vitest"

import type { TaskCard } from "../../src/core/types"
import type { Board } from "../../src/repository/contracts"
import type { BoardViewState } from "../../src/ui/state/board-store"
import { renderBoard } from "../../src/ui/view/render-board"

const board: Board = {
  id: "board-001",
  title: "Execution Board",
  columns: [
    { id: "planned", title: "Planned" },
    { id: "active", title: "Active" },
    { id: "blocked", title: "Blocked" },
  ],
  agent_registry: {
    local: [],
    host: [],
    ad_hoc: [],
  },
}

const tasks: TaskCard[] = [
  {
    id: "task-001",
    title: "Ship board renderer shell",
    status: "active",
    source_file: ".tasks/tasks/task-001.md",
    updated_at: "2026-03-27T09:00:00Z",
    assignees: ["orchestrator"],
  },
  {
    id: "task-002",
    title: "Resolve API schema mismatch",
    status: "blocked",
    source_file: ".tasks/tasks/task-002.md",
    updated_at: "2026-03-27T10:00:00Z",
    required_agents: ["frontend", "backend"],
    blocked_reason: "Waiting for backend contract",
  },
]

const successState: BoardViewState = {
  state: "success",
  board,
  tasks,
}

function createRoot() {
  return new Window().document.createElement("div")
}

describe("renderBoard", () => {
  it("renders loading, empty, error and success states with headings", () => {
    const root = createRoot()

    renderBoard(root, { state: "loading" })
    const loadingState = root.querySelector('[role="status"]')
    expect(loadingState?.querySelector("h2")?.textContent).toMatch(/loading/i)
    expect(loadingState?.getAttribute("aria-live")).toBe("polite")

    renderBoard(root, { state: "empty", message: "No tasks found yet" })
    const emptyState = root.querySelector('[role="status"]')
    expect(emptyState?.querySelector("h2")?.textContent).toMatch(/empty/i)
    expect(emptyState?.textContent).toContain("No tasks found yet")

    renderBoard(root, { state: "error", message: "Board failed to load" })
    const errorState = root.querySelector('[role="alert"]')
    expect(errorState?.querySelector("h2")?.textContent).toMatch(/error/i)
    expect(errorState?.textContent).toContain("Board failed to load")

    renderBoard(root, successState)
    const boardRegion = root.querySelector('section[aria-label="Execution Board"]')

    expect(boardRegion).not.toBeNull()
    expect(boardRegion?.querySelector("h1")?.textContent).toContain("Execution Board")
    expect(boardRegion?.querySelector('[data-column-id="planned"] h2')?.textContent).toContain("Planned")
    expect(boardRegion?.querySelector('[data-column-id="blocked"] h2')?.textContent).toContain("Blocked")
  })

  it("renders task cards with blocker and agent metadata as articles", () => {
    const root = createRoot()

    renderBoard(root, successState)

    const activeCard = root.querySelector('article[data-task-id="task-001"]')
    const blockedCard = root.querySelector('article[data-task-id="task-002"]')

    expect(root.querySelectorAll("article")).toHaveLength(2)
    expect(activeCard?.querySelector("h3")?.textContent).toContain("Ship board renderer shell")
    expect(activeCard?.textContent).toContain("active")
    expect(activeCard?.textContent).toContain("orchestrator")

    expect(blockedCard?.querySelector("h3")?.textContent).toContain("Resolve API schema mismatch")
    expect(blockedCard?.textContent).toContain("blocked")
    expect(blockedCard?.textContent).toContain("Waiting for backend contract")
    expect(blockedCard?.textContent).toContain("frontend")
    expect(blockedCard?.textContent).toContain("backend")
  })
})
