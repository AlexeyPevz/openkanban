import type { TaskCard } from "../../core/types.js"
import type { TaskPatch, TaskRepository } from "../contracts.js"

export async function updateTask(repository: TaskRepository, id: string, patch: TaskPatch): Promise<TaskCard> {
  return repository.writeTaskMetadata(id, patch)
}
