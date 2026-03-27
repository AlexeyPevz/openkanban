import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { type Board, BoardSchema, type StatusWriteInput, type TaskPatch } from "../contracts.js"
import type { TaskCard } from "../../core/types.js"

export class KanbanJsonRepository {
  constructor(private readonly rootDir: string) {}

  async loadBoard(): Promise<Board> {
    const filePath = join(this.rootDir, ".kanban", "board.json")
    const raw = await readFile(filePath, "utf8")
    const parsed = JSON.parse(raw) as { board?: { id?: string; columns?: string[] } }

    return BoardSchema.parse({
      id: parsed.board?.id ?? "fallback-kanban-json-board",
      title: "Fallback Kanban JSON Board",
      readOnly: true,
      columns: (parsed.board?.columns ?? ["planned", "active", "review", "done", "blocked"]).map((column) => ({
        id: column,
        title: column,
      })),
    })
  }

  async loadTasks(): Promise<TaskCard[]> {
    return []
  }

  async loadTaskById(_id: string): Promise<TaskCard | null> {
    return null
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
