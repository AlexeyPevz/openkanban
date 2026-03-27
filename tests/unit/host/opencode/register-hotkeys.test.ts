import { describe, expect, it } from "vitest"

import { createOpenCodeAdapter } from "../../../../src/host/opencode/adapter"
import { registerBoardHotkeys } from "../../../../src/host/opencode/register-hotkeys"

describe("host/opencode register-hotkeys", () => {
  it("registers hotkeys for open, toggle, details and manual rescan", () => {
    const adapter = createOpenCodeAdapter({
      overlay: { status: "unsupported", evidence: ["test"], fallback: "command-panel", verified_at: "2026-03-26T00:00:00Z" },
      commands: { status: "unsupported-by-environment", evidence: ["test"], fallback: "tool-triggered open board flow", verified_at: "2026-03-26T00:00:00Z" },
      hotkeys: { status: "unsupported-by-environment", evidence: ["test"], fallback: "board-local keyboard handling", verified_at: "2026-03-26T00:00:00Z" },
      runtimeEvents: { status: "unsupported-by-environment", evidence: ["test"], fallback: "file-change-first orchestration", verified_at: "2026-03-26T00:00:00Z" },
      themeContext: { status: "unsupported-by-environment", evidence: ["test"], fallback: "default monochrome tokens", verified_at: "2026-03-26T00:00:00Z" },
    })

    const hotkeys = registerBoardHotkeys(adapter)

    expect(hotkeys.openBoard.id).toBe("kanban.hotkey.openBoard")
    expect(hotkeys.toggleBoard.id).toBe("kanban.hotkey.toggleBoard")
    expect(hotkeys.openDetails.id).toBe("kanban.hotkey.openDetails")
    expect(hotkeys.manualRescan.id).toBe("kanban.hotkey.manualRescan")
  })
})
