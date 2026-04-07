import { describe, expect, it } from "vitest"

import type { SourceCandidate } from "@neon-tiger/core"
import { selectPrimarySource } from "@neon-tiger/core"

function createCandidate(input: Partial<SourceCandidate> & Pick<SourceCandidate, "kind" | "path" | "priority">): SourceCandidate {
  return {
    validity: "valid",
    metadataCompleteness: 50,
    ...input,
  }
}

describe("discovery/select-primary-source", () => {
  it("prefers .tasks/board.yml", () => {
    const result = selectPrimarySource([
      createCandidate({ kind: "tasks-yml", path: ".tasks/tasks.yml", priority: 2 }),
      createCandidate({ kind: "canonical-board-yaml", path: ".tasks/board.yml", priority: 1 }),
      createCandidate({ kind: "kanban-json", path: ".kanban/board.json", priority: 3 }),
    ])

    expect(result?.kind).toBe("canonical-board-yaml")
  })

  it("enters degraded mode when same-priority candidates conflict", () => {
    const result = selectPrimarySource([
      createCandidate({ kind: "tasks-yml", path: ".tasks/tasks.yml", priority: 1, metadataCompleteness: 90 }),
      createCandidate({ kind: "kanban-json", path: ".kanban/board.json", priority: 1, metadataCompleteness: 90 }),
    ])

    expect(result?.mode).toBe("degraded")
    expect(result?.readOnly).toBe(true)
    expect(result?.warning).toMatch(/conflict/i)
  })

  it("prefers the most complete metadata when same-priority candidates are both valid", () => {
    const result = selectPrimarySource([
      createCandidate({ kind: "tasks-yml", path: ".tasks/tasks.yml", priority: 2, metadataCompleteness: 10 }),
      createCandidate({ kind: "kanban-json", path: ".kanban/board.json", priority: 2, metadataCompleteness: 80 }),
    ])

    expect(result?.path).toBe(".kanban/board.json")
    expect(result?.mode).toBe("normal")
  })

  it("prefers canonical format when completeness is equal", () => {
    const result = selectPrimarySource([
      createCandidate({ kind: "tasks-yml", path: ".tasks/tasks.yml", priority: 1, metadataCompleteness: 95 }),
      createCandidate({ kind: "canonical-board-yaml", path: ".tasks/board.yml", priority: 1, metadataCompleteness: 95 }),
    ])

    expect(result?.kind).toBe("canonical-board-yaml")
    expect(result?.mode).toBe("normal")
  })

  it("respects manual source override when provided", () => {
    const result = selectPrimarySource(
      [
        createCandidate({ kind: "canonical-board-yaml", path: ".tasks/board.yml", priority: 1 }),
        createCandidate({ kind: "kanban-json", path: ".kanban/board.json", priority: 3 }),
      ],
      { manualOverridePath: ".kanban/board.json" },
    )

    expect(result?.path).toBe(".kanban/board.json")
    expect(result?.mode).toBe("manual-override")
  })

  it("prefers the single valid candidate over an invalid candidate with higher completeness", () => {
    const result = selectPrimarySource([
      createCandidate({
        kind: "tasks-yml",
        path: ".tasks/tasks.yml",
        priority: 2,
        validity: "valid",
        metadataCompleteness: 20,
      }),
      createCandidate({
        kind: "kanban-json",
        path: ".kanban/board.json",
        priority: 2,
        validity: "invalid",
        metadataCompleteness: 100,
      }),
    ])

    expect(result?.path).toBe(".tasks/tasks.yml")
    expect(result?.validity).toBe("valid")
    expect(result?.mode).toBe("normal")
  })

  it("ignores invalid completeness when choosing among multiple valid candidates", () => {
    const result = selectPrimarySource([
      createCandidate({
        kind: "tasks-yml",
        path: ".tasks/tasks.yml",
        priority: 2,
        validity: "valid",
        metadataCompleteness: 70,
      }),
      createCandidate({
        kind: "tasks-markdown",
        path: "tasks/sample-task.md",
        priority: 2,
        validity: "valid",
        metadataCompleteness: 80,
      }),
      createCandidate({
        kind: "kanban-json",
        path: ".kanban/board.json",
        priority: 2,
        validity: "invalid",
        metadataCompleteness: 100,
      }),
    ])

    expect(result?.path).toBe("tasks/sample-task.md")
    expect(result?.validity).toBe("valid")
    expect(result?.mode).toBe("normal")
  })

  it("enters degraded read-only mode when all highest-priority candidates are invalid", () => {
    const result = selectPrimarySource([
      createCandidate({
        kind: "canonical-board-yaml",
        path: ".tasks/board.yml",
        priority: 1,
        validity: "invalid",
        metadataCompleteness: 95,
      }),
      createCandidate({
        kind: "tasks-yml",
        path: ".tasks/tasks.yml",
        priority: 1,
        validity: "invalid",
        metadataCompleteness: 90,
      }),
      createCandidate({
        kind: "kanban-json",
        path: ".kanban/board.json",
        priority: 2,
        validity: "valid",
        metadataCompleteness: 100,
      }),
    ])

    expect(result?.mode).toBe("degraded")
    expect(result?.readOnly).toBe(true)
  })

  it("keeps manual override in read-only mode when override candidate is invalid", () => {
    const result = selectPrimarySource(
      [
        createCandidate({
          kind: "canonical-board-yaml",
          path: ".tasks/board.yml",
          priority: 1,
          validity: "valid",
        }),
        createCandidate({
          kind: "kanban-json",
          path: ".kanban/board.json",
          priority: 3,
          validity: "invalid",
        }),
      ],
      { manualOverridePath: ".kanban/board.json" },
    )

    expect(result?.path).toBe(".kanban/board.json")
    expect(result?.mode).toBe("manual-override")
    expect(result?.readOnly).toBe(true)
    expect(result?.warning).toMatch(/invalid|manual override/i)
  })
})
