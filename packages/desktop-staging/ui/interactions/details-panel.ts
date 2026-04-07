import type { TaskCard } from "../../core/types.js"

export function openTaskDetails(tasks: TaskCard[], taskId: string): TaskCard | null {
  return tasks.find((task) => task.id === taskId) ?? null
}

export interface DetailsPanelRoot {
  querySelectorAll<T = unknown>(selector: string): Iterable<T>
  querySelector<T = unknown>(selector: string): T | null
}

export function attachDetailsPanel(root: DetailsPanelRoot, tasks: TaskCard[]): void {
  for (const button of root.querySelectorAll<HTMLElement>("[data-task-details-trigger]")) {
    button.addEventListener("click", () => {
      const taskId = button.getAttribute("data-task-details-trigger")
      if (!taskId) {
        return
      }

      const selected = openTaskDetails(tasks, taskId)
      if (!selected) {
        return
      }

      for (const panel of root.querySelectorAll<HTMLElement>("[data-task-details]")) {
        panel.setAttribute("hidden", "true")
      }

      root.querySelector<HTMLElement>(`[data-task-details="${selected.id}"]`)?.removeAttribute("hidden")
    })
  }
}
