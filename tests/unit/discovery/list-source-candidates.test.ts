import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { listSourceCandidates } from "../../../src/discovery/list-source-candidates"

const fixturesRoot = resolve(fileURLToPath(new URL("../../fixtures", import.meta.url)))

describe("discovery/list-source-candidates", () => {
  it("discovers canonical board source with highest priority", async () => {
    const rootDir = resolve(fixturesRoot, "canonical")

    const candidates = await listSourceCandidates(rootDir)

    expect(candidates).toContainEqual(
      expect.objectContaining({
        kind: "canonical-board-yaml",
        path: ".tasks/board.yml",
        priority: 1,
      }),
    )
  })

  it("discovers fallback sources using configured priority order", async () => {
    const rootDir = resolve(fixturesRoot, "fallback")

    const candidates = await listSourceCandidates(rootDir)

    expect(candidates.map((candidate) => candidate.path)).toEqual([
      ".tasks/tasks.yml",
      ".kanban/board.json",
      "tasks/sample-task.md",
    ])

    expect(candidates.map((candidate) => candidate.priority)).toEqual([2, 3, 4])
  })
})
