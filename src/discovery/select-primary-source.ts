import type { SourceCandidate } from "./list-source-candidates.js"
import { resolveSourceOverride, type SourceOverrideInput } from "./source-override.js"

export type SourceSelectionMode = "normal" | "manual-override" | "degraded"

export type SelectedPrimarySource = SourceCandidate & {
  mode: SourceSelectionMode
  readOnly: boolean
  warning?: string
}

const CANONICAL_BOARD_PATH = ".tasks/board.yml"

function asSelectedPrimarySource(
  candidate: SourceCandidate,
  mode: SourceSelectionMode,
  readOnly: boolean,
  warning?: string,
): SelectedPrimarySource {
  return {
    ...candidate,
    mode,
    readOnly,
    ...(warning ? { warning } : {}),
  }
}

function toSortedCandidates(candidates: SourceCandidate[]): SourceCandidate[] {
  return [...candidates].sort(
    (left, right) =>
      left.priority - right.priority ||
      right.metadataCompleteness - left.metadataCompleteness ||
      left.path.localeCompare(right.path),
  )
}

export function selectPrimarySource(
  candidates: SourceCandidate[],
  input?: SourceOverrideInput,
): SelectedPrimarySource | null {
  if (candidates.length === 0) {
    return null
  }

  const manualOverrideCandidate = resolveSourceOverride(candidates, input)
  if (manualOverrideCandidate) {
    if (manualOverrideCandidate.validity === "invalid") {
      return asSelectedPrimarySource(
        manualOverrideCandidate,
        "manual-override",
        true,
        "Manual override selected an invalid source; running in read-only mode",
      )
    }

    return asSelectedPrimarySource(manualOverrideCandidate, "manual-override", false)
  }

  const sortedCandidates = toSortedCandidates(candidates)
  const highestPriority = sortedCandidates[0]?.priority
  if (highestPriority === undefined) {
    return null
  }

  const highestPriorityCandidates = sortedCandidates.filter((candidate) => candidate.priority === highestPriority)
  const fullyValidCandidates = highestPriorityCandidates.filter((candidate) => candidate.validity === "valid")

  if (fullyValidCandidates.length === 1) {
    return asSelectedPrimarySource(fullyValidCandidates[0], "normal", false)
  }

  const normalCompletenessPool = fullyValidCandidates.length > 1 ? fullyValidCandidates : []
  if (normalCompletenessPool.length > 0) {
    const topCompleteness = Math.max(...normalCompletenessPool.map((candidate) => candidate.metadataCompleteness))
    const topCompletenessCandidates = normalCompletenessPool.filter(
      (candidate) => candidate.metadataCompleteness === topCompleteness,
    )
    if (topCompletenessCandidates.length === 1) {
      return asSelectedPrimarySource(topCompletenessCandidates[0], "normal", false)
    }
  }

  const canonicalBoardCandidate = fullyValidCandidates.find((candidate) => candidate.path === CANONICAL_BOARD_PATH)
  if (canonicalBoardCandidate) {
    return asSelectedPrimarySource(canonicalBoardCandidate, "normal", false)
  }

  const degradedCandidatePool = fullyValidCandidates.length > 0 ? fullyValidCandidates : highestPriorityCandidates
  const degradedWinner = toSortedCandidates(degradedCandidatePool)[0]

  return asSelectedPrimarySource(
    degradedWinner,
    "degraded",
    true,
    "Source conflict detected among highest-priority candidates; use manual override to resolve conflict and exit degraded mode",
  )
}
