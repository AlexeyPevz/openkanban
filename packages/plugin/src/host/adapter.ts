import type { CapabilityMatrix } from "./probe-capabilities.js"

export interface OpenCodeAdapter {
  matrix: CapabilityMatrix
  preferredBoardSurface: "overlay" | "command-panel"
  supportsRuntimeEvents: boolean
  openBoard(): void
  closeBoard(): void
  rescanBoard(): void
  toggleBoard(): void
  openSelectedTaskDetails(): void
}

export function createOpenCodeAdapter(matrix: CapabilityMatrix): OpenCodeAdapter {
  return {
    matrix,
    preferredBoardSurface: matrix.overlay.status === "verified" ? "overlay" : "command-panel",
    supportsRuntimeEvents: matrix.runtimeEvents.status === "verified",
    openBoard() {},
    closeBoard() {},
    rescanBoard() {},
    toggleBoard() {},
    openSelectedTaskDetails() {},
  }
}
