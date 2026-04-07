import type { AgentRecord, AgentRegistry, Board } from "../repository/contracts.js"
import { mergeAgentSources, SOURCE_PRIORITY, type MergeAgentSourcesInput } from "./merge-agent-sources.js"
import type { BoardYamlRepository } from "../repository/canonical/board-yaml-repository.js"

export interface ResolveAgentRegistryInput extends MergeAgentSourcesInput {}

export function resolveAgentRegistry(input: ResolveAgentRegistryInput) {
  return mergeAgentSources(input, SOURCE_PRIORITY)
}

export async function saveAdHocAgent(boardRepository: BoardYamlRepository, agent: AgentRecord): Promise<Board> {
  return boardRepository.updateAgentRegistry((registry: AgentRegistry) => ({
    ...registry,
    ad_hoc: [...registry.ad_hoc, agent],
  }))
}
