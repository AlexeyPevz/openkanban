import type { CapabilityMatrix } from "./probe-capabilities.js"

export interface RuntimeContext {
  theme: "monochrome"
  fontFamily: string
  supportsThemeContext: boolean
}

export function createRuntimeContext(matrix: CapabilityMatrix): RuntimeContext {
  return {
    theme: "monochrome",
    fontFamily: "system-ui",
    supportsThemeContext: matrix.themeContext.status === "verified",
  }
}
