import { tool } from "@opencode-ai/plugin"

export interface OpenBoardDeps {
  directory: string
  isLockActive: () => Promise<boolean>
  resolveBinary: () => Promise<string | null>
  spawnDetached: (binary: string, args: string[]) => void
}

export function makeOpenBoardHandler(deps: OpenBoardDeps) {
  return async (): Promise<string> => {
    const running = await deps.isLockActive()
    if (running) {
      return "Kanban board is already running for this project."
    }

    const binary = await deps.resolveBinary()
    if (!binary) {
      return "neon-tiger-desktop binary not found. Install it from GitHub Releases or set desktopBinaryPath in plugin config."
    }

    deps.spawnDetached(binary, ["--directory", deps.directory])
    return "Kanban board opened in desktop app."
  }
}

export function openBoardTool(deps: OpenBoardDeps) {
  return tool({
    description: "Open the visual kanban board in the desktop app",
    args: {},
    async execute(_args, context) {
      const handler = makeOpenBoardHandler(deps)
      const result = await handler()
      context.metadata({ title: "Open board" })
      return result
    },
  })
}
