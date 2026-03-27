import { readFile } from "node:fs/promises"
import { join } from "node:path"

import YAML from "yaml"

import { type Board, BoardSchema, parseTaskCard, type StatusWriteInput, type TaskPatch } from "../contracts.js"
import type { TaskCard } from "../../core/types.js"

function defaultBoard(): Board {
  return BoardSchema.parse({
    id: "fallback-tasks-yml-board",
    title: "Fallback Tasks YAML Board",
    readOnly: true,
    columns: [
      { id: "planned", title: "Planned" },
      { id: "active", title: "Active" },
      { id: "review", title: "Review" },
      { id: "done", title: "Done" },
      { id: "blocked", title: "Blocked" },
    ],
  })
}

export class TasksYmlRepository {
  constructor(private readonly rootDir: string) {}

  async loadBoard(): Promise<Board> {
    return defaultBoard()
  }

  async loadTasks(): Promise<TaskCard[]> {
    const filePath = join(this.rootDir, ".tasks", "tasks.yml")
    const raw = await readFile(filePath, "utf8")
    const parsed = YAML.parse(raw) as { tasks?: Array<Record<string, unknown>> }

    return (parsed.tasks ?? []).map((task) =>
      parseTaskCard({
        ...task,
        source_file: ".tasks/tasks.yml",
        updated_at: String(task.updated_at ?? new Date(0).toISOString()),
      }),
    )
  }

  async loadTaskById(id: string): Promise<TaskCard | null> {
    const tasks = await this.loadTasks()
    return tasks.find((task) => task.id === id) ?? null
  }

  async writeTaskStatus(_id: string, _input: StatusWriteInput): Promise<TaskCard> {
    throw new Error("Read-only fallback source; migrate to canonical .tasks/tasks/*.md to enable writes")
  }

  async writeTaskMetadata(_id: string, _input: TaskPatch): Promise<TaskCard> {
    throw new Error("Read-only fallback source; migrate to canonical .tasks/tasks/*.md to enable writes")
  }

  async createTask(): Promise<TaskCard> {
    throw new Error("Read-only fallback source; migrate to canonical .tasks/tasks/*.md to enable writes")
  }
}
