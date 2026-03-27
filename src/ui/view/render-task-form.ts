import type { TaskStatus } from "../../core/types.js"

export interface RenderTaskFormInput {
  taskId?: string
  title?: string
  status?: TaskStatus
}

export interface TaskFormDocument {
  createElement(tagName: string): any
}

const TASK_STATUSES: TaskStatus[] = ["planned", "active", "review", "done", "blocked", "parked", "cancelled"]

export function renderTaskForm(document: TaskFormDocument, input: RenderTaskFormInput = {}): HTMLFormElement {
  const form = document.createElement("form")
  const heading = document.createElement("h3")
  const titleLabel = document.createElement("label")
  const titleInput = document.createElement("input")
  const statusLabel = document.createElement("label")
  const statusSelect = document.createElement("select")

  form.setAttribute("aria-label", "Task form")
  heading.textContent = "Task form"
  titleLabel.textContent = "Title"
  titleInput.name = "title"
  titleInput.value = input.title ?? ""

  titleLabel.appendChild(titleInput)

  if (input.taskId) {
    const taskIdInput = document.createElement("input")
    taskIdInput.type = "hidden"
    taskIdInput.name = "taskId"
    taskIdInput.value = input.taskId
    form.appendChild(taskIdInput)
  } else {
    statusLabel.textContent = "Status"
    statusSelect.name = "status"

    for (const status of TASK_STATUSES) {
      const option = document.createElement("option")
      option.value = status
      option.textContent = status
      option.selected = status === (input.status ?? "planned")
      statusSelect.appendChild(option)
    }

    statusLabel.appendChild(statusSelect)
  }

  form.appendChild(heading)
  form.appendChild(titleLabel)
  if (!input.taskId) {
    form.appendChild(statusLabel)
  }

  return form
}
