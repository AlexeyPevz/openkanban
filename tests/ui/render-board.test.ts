// UI view tests — imports point to packages/desktop (M2).
// Skipped until UI files are restored in packages/desktop.
//
// Original imports (commented out — source files moved to packages/desktop-staging/ui/):
// import { Window } from "happy-dom"
// import type { TaskCard } from "../../src/core/types"
// import type { Board } from "../../src/repository/contracts"
// import type { BoardViewState } from "../../src/ui/state/board-store"
// import { renderBoard } from "../../src/ui/view/render-board"

import { describe, it } from "vitest"

describe.skip("UI view tests — restored in M2 when files move to packages/desktop", () => {
  describe("renderBoard", () => {
    it("renders loading, empty, error and success states with headings", () => {})
    it("renders task cards with blocker and agent metadata as articles", () => {})
  })
})
