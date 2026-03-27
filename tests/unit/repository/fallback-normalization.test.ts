import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { KanbanJsonRepository } from "../../../src/repository/fallback/kanban-json-repository"
import { MarkdownGlobRepository } from "../../../src/repository/fallback/markdown-glob-repository"
import { TasksYmlRepository } from "../../../src/repository/fallback/tasks-yml-repository"

const fixturesRoot = resolve(fileURLToPath(new URL("../../fixtures", import.meta.url)))

describe("repository/fallback normalization", () => {
  it("defaults missing optional fields when loading legacy task yaml", async () => {
    const repository = new TasksYmlRepository(resolve(fixturesRoot, "fallback"))

    const tasks = await repository.loadTasks()

    expect(tasks[0]?.priority).toBe("medium")
    expect(tasks[0]?.required_skills).toEqual([])
    expect(tasks[0]?.description).toBe("")
    expect(tasks[0]?.progress).toBe(0)
  })

  it("marks fallback markdown sources as read-only when write format is unknown", async () => {
    const repository = new MarkdownGlobRepository(resolve(fixturesRoot, "fallback"))

    expect((await repository.loadBoard()).readOnly).toBe(true)
  })

  it("loads fallback kanban json board as read-only board", async () => {
    const repository = new KanbanJsonRepository(resolve(fixturesRoot, "fallback"))

    const board = await repository.loadBoard()

    expect(board.id).toBe("fallback-board")
    expect(board.readOnly).toBe(true)
    expect(board.columns).toHaveLength(4)
  })
})
