import { Window } from "happy-dom"
import { describe, expect, it, vi } from "vitest"

import type { TaskCard } from "../../src/core/types"
import { attachTaskDropTarget, handleDrop } from "../../src/ui/interactions/drag-drop"
import { attachKeyboardShortcuts, createKeyboardController } from "../../src/ui/interactions/keyboard-shortcuts"
import { attachDetailsPanel, openTaskDetails } from "../../src/ui/interactions/details-panel"
import { attachTaskFormSubmit, submitTaskForm } from "../../src/ui/interactions/task-form"
import { renderTaskForm } from "../../src/ui/view/render-task-form"
import { renderBoard } from "../../src/ui/view/render-board"

const task: TaskCard = {
  id: "task-001",
  title: "Write docs",
  status: "planned",
  source_file: ".tasks/tasks/task-001.md",
  updated_at: "2026-03-27T10:00:00Z",
  required_agents: ["frontend"],
}

const board = {
  id: "board-001",
  title: "Execution Board",
  columns: [
    { id: "planned", title: "Planned" },
    { id: "active", title: "Active" },
    { id: "blocked", title: "Blocked" },
  ],
  agent_registry: { local: [], host: [], ad_hoc: [] },
}

describe("ui task interactions", () => {
  it("moves a card to blocked after failed preflight", async () => {
    const updateTaskStatus = vi.fn(async (_id, input) => ({
      ...task,
      status: input.to,
      blocked_reason: input.blocked_reason,
    }))

    const result = await handleDrop({
      task,
      targetStatus: "active",
      availableAgents: [],
      availableSkills: [],
      gateResults: [],
      updateTaskStatus,
    })

    expect(result.status).toBe("blocked")
    expect(result.blocked_reason).toMatch(/required agents/i)
    expect(updateTaskStatus).toHaveBeenCalledWith("task-001", {
      from: "planned",
      to: "blocked",
      blocked_reason: expect.stringMatching(/required agents/i),
    })
  })

  it("rejects invalid transitions before writing source-of-truth", async () => {
    const updateTaskStatus = vi.fn()

    await expect(
      handleDrop({
        task,
        targetStatus: "done",
        availableAgents: ["frontend"],
        availableSkills: [],
        gateResults: [],
        updateTaskStatus,
      }),
    ).rejects.toThrow(/not allowed/i)

    expect(updateTaskStatus).not.toHaveBeenCalled()
  })

  it("creates a task from form input and persists it", async () => {
    const createTask = vi.fn(async (input) => ({
      id: "write-docs",
      title: input.title,
      status: input.status,
    }))

    const document = new Window().document
    const form = renderTaskForm(document, {
      title: "Write docs",
      status: "planned",
    }) as HTMLFormElement

    await submitTaskForm({
      form,
      createTask,
      updateTask: vi.fn(),
    })

    expect(createTask).toHaveBeenCalledWith({
      title: "Write docs",
      status: "planned",
    })
  })

  it("updates a task from rendered form controls", async () => {
    const document = new Window().document
    const form = renderTaskForm(document, {
      taskId: "task-001",
      title: "Write docs",
    }) as HTMLFormElement

    const titleInput = form.querySelector('input[name="title"]') as HTMLInputElement
    titleInput.value = "Updated docs"

    const updateTask = vi.fn(async (_taskId, patch) => patch)

    await submitTaskForm({
      form,
      createTask: vi.fn(),
      updateTask,
    })

    expect(updateTask).toHaveBeenCalledWith("task-001", {
      title: "Updated docs",
    })
  })

  it("supports keyboard navigation, quick status change and opening details", () => {
    const controller = createKeyboardController()

    expect(controller.handle("ArrowRight")).toBe("focus-next-card")
    expect(controller.handle("ArrowLeft")).toBe("focus-previous-card")
    expect(controller.handle("KeyR")).toBe("set-status-review")
    expect(controller.handle("Enter")).toBe("open-details")
    expect(controller.handle("KeyU")).toBe("manual-rescan")
  })

  it("opens details for the selected task", () => {
    const selected = openTaskDetails([task], "task-001")

    expect(selected?.id).toBe("task-001")
    expect(selected?.title).toBe("Write docs")
  })

  it("wires keyboard shortcuts, form submit, details toggle and drop target to DOM events", async () => {
    const window = new Window()
    const root = window.document.createElement("div")
    const actions: string[] = []

    renderBoard(root as never, {
      state: "success",
      board,
      tasks: [task],
    })

    attachKeyboardShortcuts(root as never, (action) => actions.push(action))
    ;(root as any).dispatchEvent(new window.KeyboardEvent("keydown", { code: "KeyU" }))
    expect(actions).toContain("manual-rescan")

    attachDetailsPanel(root as never, [task])
    const detailsButton = root.querySelector('[data-task-details-trigger="task-001"]') as unknown as HTMLButtonElement
    detailsButton.click()
    const details = root.querySelector('[data-task-details="task-001"]') as unknown as HTMLElement
    expect(details.hasAttribute("hidden")).toBe(false)

    const form = renderTaskForm(window.document, {
      title: "Wire form",
      status: "planned",
    })
    const createTask = vi.fn(async () => null)
    attachTaskFormSubmit({
      form,
      createTask,
      updateTask: vi.fn(),
    })
    ;(form as any).dispatchEvent(new window.Event("submit"))
    expect(createTask).toHaveBeenCalled()

    const card = root.querySelector('[data-task-id="task-001"]') as unknown as HTMLElement
    const updateTaskStatus = vi.fn(async (_id, input) => ({ ...task, status: input.to }))
    attachTaskDropTarget(card, () => ({
      task,
      targetStatus: "active",
      availableAgents: ["frontend"],
      availableSkills: [],
      gateResults: [],
      updateTaskStatus,
    }))
    ;(card as any).dispatchEvent(new window.Event("drop"))
    await vi.waitFor(() => {
      expect(updateTaskStatus).toHaveBeenCalled()
    })
  })
})
