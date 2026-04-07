import { randomUUID } from "node:crypto"

import { CreateTaskEventInputSchema, TaskEventSchema } from "../schemas.js"
import type { CreateTaskEventInput, TaskEvent } from "../types.js"

export function createTaskEvent(input: CreateTaskEventInput): TaskEvent {
  const parsed = CreateTaskEventInputSchema.parse(input)

  const event = {
    event_id: input.eventIdFactory?.() ?? randomUUID(),
    correlation_id: parsed.correlationId,
    task_id: parsed.task.id,
    from_status: parsed.from,
    to_status: parsed.to,
    timestamp: input.now?.() ?? new Date().toISOString(),
    source_file: parsed.task.source_file,
    initiator: parsed.initiator,
    preflight_result: parsed.preflightResult,
  }

  return TaskEventSchema.parse(event)
}
