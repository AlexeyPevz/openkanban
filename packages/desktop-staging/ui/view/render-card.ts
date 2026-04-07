import type { TaskCard } from "../../core/types.js"
import { getTaskAgents, hasTaskBlocker } from "../state/board-store.js"
import type { BoardRenderDocument, BoardRenderElement } from "./render-board.js"
import { renderDetails } from "./render-details.js"

export function renderCard(document: BoardRenderDocument, task: TaskCard): BoardRenderElement {
  const cardElement = document.createElement("article")
  const titleElement = document.createElement("h3")
  const statusElement = document.createElement("p")
  const agentsElement = document.createElement("p")
  const detailsButton = document.createElement("button")

  const titleId = `task-${task.id}-title`
  const agents = getTaskAgents(task)

  cardElement.setAttribute("data-task-id", task.id)
  cardElement.setAttribute("aria-labelledby", titleId)
  cardElement.setAttribute("draggable", "true")
  cardElement.setAttribute("tabindex", "0")

  titleElement.setAttribute("id", titleId)
  titleElement.textContent = task.title
  statusElement.textContent = `Status: ${task.status}`
  detailsButton.setAttribute("type", "button")
  detailsButton.setAttribute("data-task-details-trigger", task.id)
  detailsButton.textContent = "Open details"

  cardElement.appendChild(titleElement)
  cardElement.appendChild(statusElement)
  cardElement.appendChild(detailsButton)

  if (hasTaskBlocker(task)) {
    const blockerElement = document.createElement("p")
    blockerElement.textContent = task.blocked_reason
      ? `Blocked: ${task.blocked_reason}`
      : "Blocked"
    cardElement.appendChild(blockerElement)
  }

  if (agents.length > 0) {
    agentsElement.textContent = `Agents: ${agents.join(", ")}`
    cardElement.appendChild(agentsElement)
  }

  cardElement.appendChild(renderDetails(document, task, agents))

  return cardElement
}
