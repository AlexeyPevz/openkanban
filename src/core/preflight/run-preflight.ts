import { PreflightInputSchema, PreflightResultSchema } from "../schemas.js"
import type { GateResult, PreflightInput, PreflightResult } from "../types.js"

function block(reason: string): PreflightResult {
  return PreflightResultSchema.parse({
    ok: false,
    nextStatus: "blocked",
    reason,
  })
}

export function runPreflight(input: PreflightInput): PreflightResult {
  const parsed = PreflightInputSchema.parse(input)

  if (parsed.targetStatus !== "active") {
    return PreflightResultSchema.parse({
      ok: true,
      nextStatus: parsed.targetStatus,
    })
  }

  if (parsed.task.title.trim().length === 0) {
    return block("Task title is required before activation")
  }

  if (parsed.task.source_file.trim().length === 0) {
    return block("Source file is required before activation")
  }

  const missingAgents = parsed.task.required_agents.filter((agentId: string) => !parsed.availableAgents.includes(agentId))
  if (missingAgents.length > 0) {
    return block(`Required agents are missing: ${missingAgents.join(", ")}`)
  }

  const missingSkills = parsed.task.required_skills.filter((skillId: string) => !parsed.availableSkills.includes(skillId))
  if (missingSkills.length > 0) {
    return block(`Required skills are missing: ${missingSkills.join(", ")}`)
  }

  const failingGate = parsed.gateResults.find((gate: GateResult) => !gate.ok)
  if (failingGate) {
    return block(failingGate.reason ?? `Gate failed: ${failingGate.key}`)
  }

  return PreflightResultSchema.parse({
    ok: true,
    nextStatus: "active",
  })
}
