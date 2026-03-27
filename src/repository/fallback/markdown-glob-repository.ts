import { readFile } from "node:fs/promises"
import { join } from "node:path"

import fg from "fast-glob"
import matter from "gray-matter"

import { type Board, BoardSchema, parseTaskCard, type StatusWriteInput, type TaskPatch } from "../contracts.js"
import type { TaskCard } from "../../core/types.js"

export class MarkdownGlobRepository {
  constructor(private readonly rootDir: string, private readonly pattern = "tasks/**/*.md") {}

  async loadBoard(): Promise<Board> {
    return BoardSchema.parse({
      id: "fallback-markdown-board",
      title: "Fallback Markdown Board",
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

  async loadTasks(): Promise<TaskCard[]> {
    const matches = await fg(this.pattern, {
      cwd: this.rootDir,
      onlyFiles: true,
      unique: true,
    })

    return Promise.all(
      matches.map(async (match) => {
        const raw = await readFile(join(this.rootDir, match), "utf8")
        const parsed = matter(raw)

        return parseTaskCard({
          ...parsed.data,
          source_file: match.replaceAll("\\", "/"),
          updated_at:
            parsed.data.updated_at instanceof Date
              ? parsed.data.updated_at.toISOString()
              : String(parsed.data.updated_at ?? new Date(0).toISOString()),
        })
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
