import { describe, expect, it, vi } from "vitest"
import { makeOpenBoardHandler, type OpenBoardDeps } from "../../../../packages/plugin/src/tools/open-board.js"

describe("kanban_open_board handler", () => {
  it("returns already-running message when lock exists", async () => {
    const deps: OpenBoardDeps = {
      directory: "/project",
      isLockActive: vi.fn().mockResolvedValue(true),
      resolveBinary: vi.fn(),
      spawnDetached: vi.fn(),
    }
    const handler = makeOpenBoardHandler(deps)
    const result = await handler()
    expect(result).toContain("already running")
    expect(deps.spawnDetached).not.toHaveBeenCalled()
  })

  it("spawns binary when no lock", async () => {
    const deps: OpenBoardDeps = {
      directory: "/project",
      isLockActive: vi.fn().mockResolvedValue(false),
      resolveBinary: vi.fn().mockResolvedValue("/usr/bin/openkanban-desktop"),
      spawnDetached: vi.fn(),
    }
    const handler = makeOpenBoardHandler(deps)
    const result = await handler()
    expect(result).toContain("opened")
    expect(deps.spawnDetached).toHaveBeenCalledWith(
      "/usr/bin/openkanban-desktop",
      ["--directory", "/project"],
    )
  })

  it("returns error when binary not found", async () => {
    const deps: OpenBoardDeps = {
      directory: "/project",
      isLockActive: vi.fn().mockResolvedValue(false),
      resolveBinary: vi.fn().mockResolvedValue(null),
      spawnDetached: vi.fn(),
    }
    const handler = makeOpenBoardHandler(deps)
    const result = await handler()
    expect(result).toContain("not found")
    expect(deps.spawnDetached).not.toHaveBeenCalled()
  })
})
