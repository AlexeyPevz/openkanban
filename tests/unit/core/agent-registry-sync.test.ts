import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { mergeAgentSources, resolveAgentRegistry, BoardYamlRepository } from "@neon-tiger/core"

// saveAdHocAgent is not exported from barrel — import directly
import { saveAdHocAgent } from "../../../packages/core/src/agents/resolve-agent-registry"

describe("core/agent registry sync", () => {
  let rootDir: string

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "kanban-agent-registry-"))
    await mkdir(join(rootDir, ".tasks"), { recursive: true })
    await writeFile(
      join(rootDir, ".tasks", "board.yml"),
      [
        "board:",
        "  id: canonical-board",
        "  title: Canonical Board",
        "  columns:",
        "    - id: planned",
        "      title: Planned",
        "  agent_registry:",
        "    local:",
        "      - id: frontend",
        "        label: Frontend Local",
        "    host:",
        "      - id: frontend",
        "        label: Frontend Host",
        "    ad_hoc: []",
        "",
      ].join("\n"),
      "utf8",
    )
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it("prefers local project agents over host and ad hoc agents", () => {
    const result = resolveAgentRegistry({
      localAgents: [{ id: "frontend", label: "Frontend Local" }],
      hostAgents: [{ id: "frontend", label: "Frontend Host" }],
      adHocAgents: [{ id: "frontend", label: "Frontend AdHoc" }],
    })

    expect(result.byId.frontend.source).toBe("local")
    expect(result.byId.frontend.label).toBe("Frontend Local")
  })

  it("persists ad hoc agents next to board metadata without overwriting local agents", async () => {
    const repository = new BoardYamlRepository(rootDir)

    const updatedBoard = await saveAdHocAgent(repository, {
      id: "researcher",
      label: "Researcher AdHoc",
    })

    expect(updatedBoard.agent_registry.ad_hoc[0].id).toBe("researcher")
    expect(updatedBoard.agent_registry.local[0].id).toBe("frontend")
  })

  it("emits a warning when ids conflict across sources", () => {
    const result = mergeAgentSources({
      localAgents: [{ id: "frontend", label: "Frontend Local" }],
      hostAgents: [{ id: "frontend", label: "Frontend Host" }],
      adHocAgents: [{ id: "frontend", label: "Frontend AdHoc" }],
    })

    expect(result.warnings[0]).toMatch(/conflict/i)
  })
})
