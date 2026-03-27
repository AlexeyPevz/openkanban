import { describe, expect, it } from "vitest"

import { runPreflight } from "../../../src/core/preflight/run-preflight"

describe("core/preflight", () => {
  it("blocks planned to active when title missing", () => {
    const result = runPreflight({
      task: {
        id: "task-002",
        title: "",
        status: "planned",
        source_file: ".tasks/tasks/task-002.md",
        updated_at: "2026-03-26T00:00:00Z",
      },
      targetStatus: "active",
      availableAgents: ["backend"],
      availableSkills: ["testing-tdd"],
      gateResults: [{ key: "basic-check", ok: true }],
    })

    expect(result.ok).toBe(false)
    expect(result.nextStatus).toBe("blocked")
    expect(result.reason).toMatch(/title/i)
  })

  it("blocks activation when required agents/skills/gates missing", () => {
    const result = runPreflight({
      task: {
        id: "task-003",
        title: "UI task",
        status: "planned",
        required_agents: ["frontend"],
        required_skills: ["accessibility"],
        source_file: ".tasks/tasks/task-003.md",
        updated_at: "2026-03-26T00:00:00Z",
      },
      targetStatus: "active",
      availableAgents: ["backend"],
      availableSkills: ["testing-tdd"],
      gateResults: [{ key: "ui-review", ok: false, reason: "UI review gate missing" }],
    })

    expect(result.ok).toBe(false)
    expect(result.nextStatus).toBe("blocked")
    expect(result.reason).toMatch(/required|missing|gate/i)
  })
})
