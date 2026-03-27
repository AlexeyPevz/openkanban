import { getTasksForColumn, type BoardViewState } from "../state/board-store.js"
import { renderColumn } from "./render-column.js"

export interface BoardRenderDocument {
  createElement(tagName: string): BoardRenderElement
}

export interface BoardRenderElement {
  ownerDocument?: BoardRenderDocument | null
  textContent: string | null
  innerHTML: string
  append(...nodes: Array<BoardRenderElement | string>): void
  appendChild<T extends BoardRenderElement>(node: T): T
  setAttribute(name: string, value: string): void
}

export function renderBoard(root: BoardRenderElement, viewState: BoardViewState): void {
  root.innerHTML = ""

  const document = getOwnerDocument(root)

  switch (viewState.state) {
    case "loading":
      root.appendChild(renderState(document, "loading", "Loading board", "Board data is loading.", "status"))
      return

    case "empty":
      root.appendChild(renderState(document, "empty", "Empty board", viewState.message, "status"))
      return

    case "error":
      root.appendChild(renderState(document, "error", "Board error", viewState.message, "alert"))
      return

    case "success": {
      const boardElement = document.createElement("section")
      const titleElement = document.createElement("h1")
      const columnsElement = document.createElement("div")

      boardElement.setAttribute("role", "region")
      boardElement.setAttribute("aria-label", viewState.board.title)
      boardElement.setAttribute("data-board-id", viewState.board.id)

      titleElement.textContent = viewState.board.title
      columnsElement.setAttribute("aria-label", `${viewState.board.title} columns`)

      boardElement.appendChild(titleElement)

      if ((viewState.diagnostics?.length ?? 0) > 0) {
        const diagnosticsElement = document.createElement("section")
        const diagnosticsHeading = document.createElement("h2")

        diagnosticsElement.setAttribute("role", "status")
        diagnosticsElement.setAttribute("aria-live", "polite")
        diagnosticsElement.setAttribute("data-board-diagnostics", "warning")
        diagnosticsHeading.textContent = "Board warning diagnostics"
        diagnosticsElement.appendChild(diagnosticsHeading)

        for (const diagnostic of viewState.diagnostics ?? []) {
          const diagnosticLine = document.createElement("p")
          diagnosticLine.textContent = `${diagnostic.severity}: ${diagnostic.message}`
          diagnosticsElement.appendChild(diagnosticLine)
        }

        boardElement.appendChild(diagnosticsElement)
      }

      for (const column of viewState.board.columns) {
        columnsElement.appendChild(renderColumn(document, column, getTasksForColumn(viewState.tasks, column.id)))
      }

      boardElement.appendChild(columnsElement)
      root.appendChild(boardElement)
      return
    }
  }
}

function renderState(
  document: BoardRenderDocument,
  state: "loading" | "empty" | "error",
  heading: string,
  message: string,
  role: "status" | "alert",
): BoardRenderElement {
  const stateElement = document.createElement("section")
  const headingElement = document.createElement("h2")
  const messageElement = document.createElement("p")

  headingElement.textContent = heading
  messageElement.textContent = message

  stateElement.setAttribute("data-board-view", state)
  stateElement.setAttribute("role", role)
  stateElement.setAttribute("aria-live", role === "alert" ? "assertive" : "polite")
  stateElement.appendChild(headingElement)
  stateElement.appendChild(messageElement)

  return stateElement
}

function getOwnerDocument(root: BoardRenderElement): BoardRenderDocument {
  const document = root.ownerDocument

  if (!document) {
    throw new Error("Board root is missing ownerDocument")
  }

  return document
}
