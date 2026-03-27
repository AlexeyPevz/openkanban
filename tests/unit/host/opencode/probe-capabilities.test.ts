import { describe, expect, it } from "vitest"

import { probeCapabilities } from "../../../../src/host/opencode/probe-capabilities"

describe("host/opencode probe-capabilities", () => {
  it("records evidence for each host surface instead of hardcoding support", async () => {
    const matrix = await probeCapabilities({
      pluginExports: ["tool"],
      liveHostAvailable: false,
    })

    expect(matrix.overlay.evidence.length).toBeGreaterThan(0)
    expect(matrix.overlay.verified_at).toMatch(/^20/)
  })

  it("marks canonical fallback for every non-verified surface", async () => {
    const matrix = await probeCapabilities({
      pluginExports: ["tool"],
      liveHostAvailable: false,
    })

    expect(matrix.commands.fallback).toBeTruthy()
    expect(matrix.hotkeys.fallback).toBeTruthy()
    expect(matrix.runtimeEvents.fallback).toBeTruthy()
    expect(matrix.themeContext.fallback).toBeTruthy()
  })

  it("classifies unavailable live-host-only surfaces as unsupported-by-environment", async () => {
    const matrix = await probeCapabilities({
      pluginExports: ["tool"],
      liveHostAvailable: false,
    })

    expect(matrix.commands.status).toBe("unsupported-by-environment")
    expect(matrix.hotkeys.status).toBe("unsupported-by-environment")
    expect(matrix.runtimeEvents.status).toBe("unsupported-by-environment")
    expect(matrix.themeContext.status).toBe("unsupported-by-environment")
  })
})
