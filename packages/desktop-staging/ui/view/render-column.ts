import type { TaskCard } from "../../core/types.js"
import type { BoardColumn } from "../../repository/contracts.js"
import type { BoardRenderDocument, BoardRenderElement } from "./render-board.js"
import { renderCard } from "./render-card.js"

export function renderColumn(
  document: BoardRenderDocument,
  column: BoardColumn,
  tasks: TaskCard[],
): BoardRenderElement {
  const columnElement = document.createElement("section")
  const headingElement = document.createElement("h2")
  const cardsElement = document.createElement("div")

  const headingId = `column-${column.id}-heading`

  columnElement.setAttribute("data-column-id", column.id)
  columnElement.setAttribute("aria-labelledby", headingId)

  headingElement.setAttribute("id", headingId)
  headingElement.textContent = column.title

  cardsElement.setAttribute("aria-label", `${column.title} tasks`)

  columnElement.appendChild(headingElement)

  if (tasks.length === 0) {
    const emptyMessage = document.createElement("p")
    emptyMessage.textContent = "No tasks"
    cardsElement.appendChild(emptyMessage)
  }

  for (const task of tasks) {
    cardsElement.appendChild(renderCard(document, task))
  }

  columnElement.appendChild(cardsElement)

  return columnElement
}
