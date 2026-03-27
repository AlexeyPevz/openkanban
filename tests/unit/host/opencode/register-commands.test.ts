import { describe, expect, it } from "vitest"

import { createOpenCodeAdapter } from "../../../../src/host/opencode/adapter"
import { registerBoardCommands } from "../../../../src/host/opencode/register-commands"

describe("host/opencode register-commands", () => {
  it("registers open, close and manual rescan board commands", () => {
    const adapter = createOpenCodeAdapter({
      overlay: { status: "unsupported", evidence: ["test"], fallback: "command-panel", verified_at: "2026-03-26T00:00:00Z" },
      commands: { status: "unsupported-by-environment", evidence: ["test"], fallback: "tool-triggered open board flow", verified_at: "2026-03-26T00:00:00Z" },
      hotkeys: { status: "unsupported-by-environment", evidence: ["test"], fallback: "board-local keyboard handling", verified_at: "2026-03-26T00:00:00Z" },
      runtimeEvents: { status: "unsupported-by-environment", evidence: ["test"], fallback: "file-change-first orchestration", verified_at: "2026-03-26T00:00:00Z" },
      themeContext: { status: "unsupported-by-environment", evidence: ["test"], fallback: "default monochrome tokens", verified_at: "2026-03-26T00:00:00Z" },
    })

    const commands = registerBoardCommands(adapter)

    expect(commands.openBoard.id).toBe("kanban.openBoard")
    expect(commands.closeBoard.id).toBe("kanban.closeBoard")
    expect(commands.manualRescan.id).toBe("kanban.manualRescan")
  })
})
