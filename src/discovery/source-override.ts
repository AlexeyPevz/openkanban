import type { SourceCandidate } from "./list-source-candidates.js"

export interface SourceOverrideInput {
  manualOverridePath?: string
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/")
}

export function resolveSourceOverride(
  candidates: SourceCandidate[],
  input: SourceOverrideInput | undefined,
): SourceCandidate | null {
  const overridePath = input?.manualOverridePath
  if (!overridePath) {
    return null
  }

  const normalizedOverridePath = normalizePath(overridePath)
  return candidates.find((candidate) => normalizePath(candidate.path) === normalizedOverridePath) ?? null
}
