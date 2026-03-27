import type { TaskStatus } from "../../core/types.js"

export interface SubmitTaskFormInput {
  form: HTMLFormElement
  createTask: (input: { title: string; status: TaskStatus }) => Promise<unknown>
  updateTask: (taskId: string, patch: Record<string, unknown>) => Promise<unknown>
}

export async function submitTaskForm(input: SubmitTaskFormInput): Promise<unknown> {
  const titleInput = input.form.querySelector('input[name="title"]') as HTMLInputElement | null
  const statusSelect = input.form.querySelector('select[name="status"]') as HTMLSelectElement | null
  const taskIdInput = input.form.querySelector('input[name="taskId"]') as HTMLInputElement | null

  const title = titleInput?.value ?? ""
  const status = (statusSelect?.value ?? "planned") as TaskStatus

  if (taskIdInput?.value) {
    return input.updateTask(taskIdInput.value, {
      title,
    })
  }

  return input.createTask({
    title,
    status,
  })
}

export function attachTaskFormSubmit(input: SubmitTaskFormInput): void {
  input.form.addEventListener("submit", async (event) => {
    event.preventDefault()
    await submitTaskForm(input)
  })
}
