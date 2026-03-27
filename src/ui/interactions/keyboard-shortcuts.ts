export type KeyboardAction =
  | "focus-next-card"
  | "focus-previous-card"
  | "set-status-review"
  | "open-details"
  | "manual-rescan"
  | "noop"

export function createKeyboardController() {
  return {
    handle(key: string): KeyboardAction {
      switch (key) {
        case "ArrowRight":
          return "focus-next-card"
        case "ArrowLeft":
          return "focus-previous-card"
        case "KeyR":
          return "set-status-review"
        case "Enter":
          return "open-details"
        case "KeyU":
          return "manual-rescan"
        default:
          return "noop"
      }
    },
  }
}

export function attachKeyboardShortcuts(
  target: { addEventListener(type: string, listener: (event: unknown) => void): void },
  onAction: (action: KeyboardAction) => void,
): void {
  const controller = createKeyboardController()

  target.addEventListener("keydown", (event) => {
    const keyboardEvent = event as { code?: string; key?: string }
    const action = controller.handle(keyboardEvent.code || keyboardEvent.key || "")
    if (action !== "noop") {
      onAction(action)
    }
  })
}
