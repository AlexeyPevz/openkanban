import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { loadBoardWithDiagnostics } from "@neon-tiger/core"

describe("repository partial parse failure resilience", () => {
  let rootDir: string

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "kanban-partial-parse-"))
    const tasksDir = join(rootDir, ".tasks", "tasks")
    await mkdir(tasksDir, { recursive: true })

    await writeFile(
      join(rootDir, ".tasks", "board.yml"),
      [
        "board:",
        "  id: degraded-board",
        "  title: Degraded Board",
        "  columns:",
        "    - id: planned",
        "      title: Planned",
        "    - id: blocked",
        "      title: Blocked",
        "",
      ].join("\n"),
      "utf8",
    )

    await writeFile(
      join(tasksDir, "task-valid.md"),
      [
        "---",
        "id: task-valid",
        "title: Valid task",
        "status: planned",
        "source_file: .tasks/tasks/task-valid.md",
        "updated_at: 2026-03-27T00:00:00Z",
        "---",
        "",
        "Valid task body.",
      ].join("\n"),
      "utf8",
    )

    await writeFile(
      join(tasksDir, "task-broken.md"),
      [
        "---",
        "id: task-broken",
        "status: blocked",
        "---",
        "",
        "Broken because title is missing.",
      ].join("\n"),
      "utf8",
    )

    await writeFile(
      join(tasksDir, "task-missing-updated-at.md"),
      [
        "---",
        "id: task-missing-updated-at",
        "title: Missing updated_at task",
        "status: planned",
        "source_file: .tasks/tasks/task-missing-updated-at.md",
        "---",
        "",
        "Broken because updated_at is missing.",
      ].join("\n"),
      "utf8",
    )
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it("keeps the board readable when one task file fails to parse", async () => {
    const board = await loadBoardWithDiagnostics(rootDir)

    expect(board.state).toBe("success")
    expect(board.tasks.length).toBeGreaterThan(0)
    expect(board.tasks).toHaveLength(1)
    expect(board.tasks[0]?.id).toBe("task-valid")
    expect(board.diagnostics?.[0]?.severity).toBe("warning")
    expect(board.diagnostics?.[0]?.message).toMatch(/task-broken/i)
    expect(board.diagnostics?.[1]?.message).toMatch(/task-missing-updated-at/i)
  })
})
