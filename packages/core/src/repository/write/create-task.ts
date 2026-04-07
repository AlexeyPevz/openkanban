import type { TaskStatus } from "../../types.js"
import type { TaskCard } from "../../types.js"
import type { TaskRepository } from "../contracts.js"

export interface CreateTaskRequest {
  title: string
  status: TaskStatus
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function createTask(repository: TaskRepository, input: CreateTaskRequest): Promise<TaskCard> {
  const id = slugify(input.title)
  const sourceFile = `.tasks/tasks/${id}.md`

  return repository.createTask({
    id,
    title: input.title,
    status: input.status,
    source_file: sourceFile,
    updated_at: new Date().toISOString(),
  })
}
