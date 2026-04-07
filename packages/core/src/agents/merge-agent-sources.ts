import type { AgentRecord } from "../repository/contracts.js"

export type AgentSource = "local" | "host" | "adHoc"

export interface MergeAgentSourcesInput {
  localAgents?: AgentRecord[]
  hostAgents?: AgentRecord[]
  adHocAgents?: AgentRecord[]
}

export interface ResolvedAgentRecord extends AgentRecord {
  source: AgentSource
}

export interface AgentRegistryMergeResult {
  byId: Record<string, ResolvedAgentRecord>
  warnings: string[]
}

export const SOURCE_PRIORITY: Record<AgentSource, number> = {
  local: 1,
  host: 2,
  adHoc: 3,
}

const SOURCE_LIST: Array<{ source: AgentSource; agentsKey: keyof MergeAgentSourcesInput }> = [
  { source: "local", agentsKey: "localAgents" },
  { source: "host", agentsKey: "hostAgents" },
  { source: "adHoc", agentsKey: "adHocAgents" },
]

export function mergeAgentSources(
  input: MergeAgentSourcesInput,
  priorities: Record<AgentSource, number> = SOURCE_PRIORITY,
): AgentRegistryMergeResult {
  const byId: Record<string, ResolvedAgentRecord> = {}
  const warnings: string[] = []

  for (const { source, agentsKey } of SOURCE_LIST) {
    for (const agent of input[agentsKey] ?? []) {
      const existing = byId[agent.id]

      if (!existing) {
        byId[agent.id] = { ...agent, source }
        continue
      }

      warnings.push(`Agent id conflict detected for '${agent.id}' between ${existing.source} and ${source}`)

      if (priorities[source] < priorities[existing.source]) {
        byId[agent.id] = { ...existing, ...agent, source }
        continue
      }

      byId[agent.id] = {
        ...agent,
        ...existing,
        source: existing.source,
      }
    }
  }

  return { byId, warnings }
}
