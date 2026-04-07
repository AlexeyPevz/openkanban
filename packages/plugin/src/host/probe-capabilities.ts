export type CapabilityStatus = "verified" | "unverified" | "unsupported" | "unsupported-by-environment"

export interface CapabilityEntry {
  status: CapabilityStatus
  evidence: string[]
  fallback: string
  verified_at: string
}

export interface CapabilityMatrix {
  overlay: CapabilityEntry
  commands: CapabilityEntry
  hotkeys: CapabilityEntry
  runtimeEvents: CapabilityEntry
  themeContext: CapabilityEntry
}

export interface ProbeCapabilitiesInput {
  pluginExports?: string[]
  liveHostAvailable?: boolean
}

function createCapabilityEntry(
  status: CapabilityStatus,
  evidence: string[],
  fallback: string,
  verifiedAt: string,
): CapabilityEntry {
  return {
    status,
    evidence,
    fallback,
    verified_at: verifiedAt,
  }
}

export async function probeCapabilities(input: ProbeCapabilitiesInput = {}): Promise<CapabilityMatrix> {
  const verifiedAt = new Date().toISOString()
  const pluginExports = input.pluginExports ?? Object.keys(await import("@opencode-ai/plugin")).sort()
  const liveHostAvailable = input.liveHostAvailable ?? false

  const exportEvidence = `plugin exports: ${pluginExports.join(", ") || "<none>"}`
  const hasOverlaySurface = pluginExports.some((key) => /overlay|panel|webview/i.test(key))

  return {
    overlay: createCapabilityEntry(
      hasOverlaySurface ? "verified" : "unsupported",
      [exportEvidence, hasOverlaySurface ? "Overlay-like export detected" : "No overlay/panel/webview export detected"],
      "command-panel",
      verifiedAt,
    ),
    commands: createCapabilityEntry(
      liveHostAvailable ? "unverified" : "unsupported-by-environment",
      [exportEvidence, liveHostAvailable ? "Live host verification required for command registration" : "Live OpenCode host unavailable in this execution environment"],
      "tool-triggered open board flow",
      verifiedAt,
    ),
    hotkeys: createCapabilityEntry(
      liveHostAvailable ? "unverified" : "unsupported-by-environment",
      [exportEvidence, liveHostAvailable ? "Live host verification required for hotkeys" : "Live OpenCode host unavailable in this execution environment"],
      "board-local keyboard handling",
      verifiedAt,
    ),
    runtimeEvents: createCapabilityEntry(
      liveHostAvailable ? "unverified" : "unsupported-by-environment",
      [exportEvidence, liveHostAvailable ? "Live host verification required for runtime event bridge" : "Live OpenCode host unavailable in this execution environment"],
      "file-change-first orchestration",
      verifiedAt,
    ),
    themeContext: createCapabilityEntry(
      liveHostAvailable ? "unverified" : "unsupported-by-environment",
      [exportEvidence, liveHostAvailable ? "Live host verification required for theme/font context" : "Live OpenCode host unavailable in this execution environment"],
      "default monochrome tokens",
      verifiedAt,
    ),
  }
}
