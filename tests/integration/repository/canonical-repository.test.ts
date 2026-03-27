import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { BoardYamlRepository } from "../../../src/repository/canonical/board-yaml-repository"
import { TaskMarkdownRepository } from "../../../src/repository/canonical/task-markdown-repository"
import { createTask } from "../../../src/repository/write/create-task"
import { updateTask } from "../../../src/repository/write/update-task"
import { updateTaskStatus } from "../../../src/repository/write/update-task-status"

async function createCanonicalWorkspace(rootDir: string) {
  const tasksDir = join(rootDir, ".tasks", "tasks")
  await mkdir(tasksDir, { recursive: true })

  await writeFile(
    join(rootDir, ".tasks", "board.yml"),
    [
      "board:",
      "  id: canonical-board",
      "  title: Canonical Board",
      "  columns:",
      "    - id: planned",
      "      title: Planned",
      "    - id: active",
      "      title: Active",
      "    - id: review",
      "      title: Review",
      "    - id: done",
      "      title: Done",
      "",
    ].join("\n"),
    "utf8",
  )

  await writeFile(
    join(tasksDir, "task-001.md"),
    [
      "---",
      "id: task-001",
      "title: First canonical task",
      "status: planned",
      `source_file: .tasks/tasks/task-001.md`,
      "updated_at: 2026-03-26T00:00:00Z",
      "---",
      "",
      "Canonical repository integration fixture.",
      "",
    ].join("\n"),
    "utf8",
  )
}

describe("repository/canonical integration", () => {
  let rootDir: string

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "kanban-canonical-repository-"))
    await createCanonicalWorkspace(rootDir)
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it("loadBoard reads canonical .tasks/board.yml", async () => {
    const repository = new BoardYamlRepository(rootDir)

    const board = await repository.loadBoard()

    expect(board.id).toBe("canonical-board")
    expect(board.columns).toHaveLength(4)
  })

  it("loadTasks reads markdown task files from .tasks/tasks/*.md", async () => {
    const repository = new TaskMarkdownRepository(rootDir)

    const tasks = await repository.loadTasks()

    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.id).toBe("task-001")
    expect(tasks[0]?.title).toBe("First canonical task")
  })

  it("loadTaskById finds the requested canonical task", async () => {
    const repository = new TaskMarkdownRepository(rootDir)

    const task = await repository.loadTaskById("task-001")

    expect(task?.id).toBe("task-001")
    expect(task?.source_file).toBe(".tasks/tasks/task-001.md")
  })

  it("createTask creates a new markdown file in canonical storage", async () => {
    const repository = new TaskMarkdownRepository(rootDir)

    const created = await createTask(repository, {
      title: "New canonical task",
      status: "planned",
    })

    expect(created.id).toBe("new-canonical-task")
    expect(created.source_file).toMatch(/\.tasks\/tasks\/.+\.md$/)

    const loaded = await repository.loadTaskById("new-canonical-task")
    expect(loaded?.title).toBe("New canonical task")
  })

  it("writeTaskStatus persists blocked_reason", async () => {
    const repository = new TaskMarkdownRepository(rootDir)

    await updateTaskStatus(repository, "task-001", {
      from: "planned",
      to: "blocked",
      blocked_reason: "Missing required skills",
    })

    const loaded = await repository.loadTaskById("task-001")
    expect(loaded?.status).toBe("blocked")
    expect(loaded?.blocked_reason).toBe("Missing required skills")
  })

  it("writeTaskMetadata persists metadata patch", async () => {
    const repository = new TaskMarkdownRepository(rootDir)

    await updateTask(repository, "task-001", {
      metadata: {
        execution_exception: "side-channel",
      },
    })

    const loaded = await repository.loadTaskById("task-001")
    expect(loaded?.metadata).toMatchObject({
      execution_exception: "side-channel",
    })
  })
})
