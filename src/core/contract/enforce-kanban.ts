import { ContractResultSchema, EnforceKanbanContractInputSchema } from "../schemas.js"
import type { ContractResult, EnforceKanbanContractInput } from "../types.js"

export function enforceKanbanContract(input: EnforceKanbanContractInput): ContractResult {
  const parsed = EnforceKanbanContractInputSchema.parse(input)

  if (parsed.executionMode === "side-channel") {
    return ContractResultSchema.parse({
      ok: true,
      nextStatus: parsed.targetStatus,
      exception: true,
      reason: "Side-channel execution must be synced back to source",
      patch: {
        metadata: {
          execution_exception: "side-channel",
          sync_back_source_file: parsed.task.source_file,
        },
      },
    })
  }

  if (parsed.targetStatus === "review" && parsed.task.artifacts.length === 0) {
    const reason = "Evidence artifacts are required before review"
    return ContractResultSchema.parse({
      ok: false,
      nextStatus: "blocked",
      reason,
      patch: {
        blocked_reason: reason,
      },
    })
  }

  return ContractResultSchema.parse({
    ok: true,
    nextStatus: parsed.targetStatus,
    patch: {},
  })
}
