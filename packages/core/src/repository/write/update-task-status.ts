import type { TaskCard } from "../../types.js"
import type { StatusWriteInput, TaskRepository } from "../contracts.js"

export async function updateTaskStatus(
  repository: TaskRepository,
  id: string,
  input: StatusWriteInput,
): Promise<TaskCard> {
  return repository.writeTaskStatus(id, input)
}
