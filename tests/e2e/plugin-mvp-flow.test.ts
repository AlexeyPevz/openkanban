import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createPluginApp } from "../../src/plugin"

describe("plugin MVP flow", () => {
  let validFixtureRoot: string
  let invalidFixtureRoot: string

  beforeEach(async () => {
    validFixtureRoot = await mkdtemp(join(tmpdir(), "kanban-plugin-valid-"))
    invalidFixtureRoot = await mkdtemp(join(tmpdir(), "kanban-plugin-invalid-"))

    await createFixtureRoot(validFixtureRoot, {
      id: "task-valid",
      title: "Valid task",
      status: "planned",
      source_file: ".tasks/tasks/task-valid.md",
      updated_at: "2026-03-27T00:00:00Z",
      required_agents: [],
    })

    await createFixtureRoot(invalidFixtureRoot, {
      id: "task-invalid",
      title: "Invalid task",
      status: "planned",
      source_file: ".tasks/tasks/task-invalid.md",
      updated_at: "2026-03-27T00:00:00Z",
      required_agents: ["frontend"],
    })
  })

  afterEach(async () => {
    await rm(validFixtureRoot, { recursive: true, force: true })
    await rm(invalidFixtureRoot, { recursive: true, force: true })
  })

  it("moves a valid planned task to active", async () => {
    const app = await createPluginApp({ directory: validFixtureRoot })

    await app.moveTask("task-valid", "active")

    const after = await app.loadBoard()
    expect(after.tasks.find((task) => task.id === "task-valid")?.status).toBe("active")
  })

  it("moves an invalid planned task to blocked and writes blocked_reason", async () => {
    const app = await createPluginApp({ directory: invalidFixtureRoot })

    await app.moveTask("task-invalid", "active")

    const after = await app.loadBoard()
    expect(after.tasks.find((task) => task.id === "task-invalid")?.status).toBe("blocked")
    expect(after.tasks.find((task) => task.id === "task-invalid")?.blocked_reason).toMatch(/required/i)
  })
})

async function createFixtureRoot(rootDir: string, taskFrontmatter: Record<string, unknown>) {
  const tasksDir = join(rootDir, ".tasks", "tasks")
  await mkdir(tasksDir, { recursive: true })

  await writeFile(
    join(rootDir, ".tasks", "board.yml"),
    [
      "board:",
      "  id: plugin-board",
      "  title: Plugin Board",
      "  columns:",
      "    - id: planned",
      "      title: Planned",
      "    - id: active",
      "      title: Active",
      "    - id: review",
      "      title: Review",
      "    - id: done",
      "      title: Done",
      "    - id: blocked",
      "      title: Blocked",
      "",
    ].join("\n"),
    "utf8",
  )

  const frontmatter = Object.entries(taskFrontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.map((item) => JSON.stringify(item)).join(", ")}]`
      }

      return `${key}: ${JSON.stringify(value)}`
    })
    .join("\n")

  const fileName = String(taskFrontmatter.id)
  await writeFile(join(tasksDir, `${fileName}.md`), `---\n${frontmatter}\n---\n`, "utf8")
}
