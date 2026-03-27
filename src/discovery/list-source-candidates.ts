import fg from "fast-glob"

export const SOURCE_PATTERNS = [
  { kind: "canonical-board-yaml", pattern: ".tasks/board.yml", priority: 1 },
  { kind: "tasks-yml", pattern: ".tasks/tasks.yml", priority: 2 },
  { kind: "kanban-json", pattern: ".kanban/board.json", priority: 3 },
  { kind: "tasks-markdown", pattern: "tasks/**/*.md", priority: 4 },
  { kind: "issues-markdown", pattern: "issues/**/*.md", priority: 5 },
] as const

export type SourceKind = (typeof SOURCE_PATTERNS)[number]["kind"]
export type SourceValidity = "valid" | "invalid"

export interface SourceCandidate {
  kind: SourceKind
  path: string
  priority: number
  validity: SourceValidity
  metadataCompleteness: number
}

const METADATA_COMPLETENESS_BY_KIND: Record<SourceKind, number> = {
  "canonical-board-yaml": 100,
  "tasks-yml": 70,
  "kanban-json": 60,
  "tasks-markdown": 40,
  "issues-markdown": 30,
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/")
}

export async function listSourceCandidates(rootDir: string): Promise<SourceCandidate[]> {
  const candidates: SourceCandidate[] = []

  for (const source of SOURCE_PATTERNS) {
    const matches = await fg(source.pattern, {
      cwd: rootDir,
      dot: true,
      onlyFiles: true,
      unique: true,
    })

    for (const match of matches) {
      candidates.push({
        kind: source.kind,
        path: normalizePath(match),
        priority: source.priority,
        validity: "valid",
        metadataCompleteness: METADATA_COMPLETENESS_BY_KIND[source.kind],
      })
    }
  }

  return candidates.sort((left, right) => left.priority - right.priority || left.path.localeCompare(right.path))
}
