import type { TaskCard } from "../../core/types.js"
import type { BoardRenderDocument, BoardRenderElement } from "./render-board.js"

export function renderDetails(
  document: BoardRenderDocument,
  task: TaskCard,
  agents: string[],
): BoardRenderElement {
  const detailsElement = document.createElement("section")
  const headingElement = document.createElement("h4")
  const statusElement = document.createElement("p")
  const sourceFileElement = document.createElement("p")

  headingElement.textContent = "Details"
  statusElement.textContent = `Current status: ${task.status}`
  sourceFileElement.textContent = `Source file: ${task.source_file}`

  detailsElement.setAttribute("aria-label", `${task.title} details`)
  detailsElement.setAttribute("data-task-details", task.id)
  detailsElement.setAttribute("hidden", "true")
  detailsElement.appendChild(headingElement)
  detailsElement.appendChild(statusElement)

  if (agents.length > 0) {
    const agentsElement = document.createElement("p")
    agentsElement.textContent = `Required agents: ${agents.join(", ")}`
    detailsElement.appendChild(agentsElement)
  }

  if (task.blocked_reason) {
    const blockerElement = document.createElement("p")
    blockerElement.textContent = `Blocked reason: ${task.blocked_reason}`
    detailsElement.appendChild(blockerElement)
  }

  detailsElement.appendChild(sourceFileElement)

  return detailsElement
}
