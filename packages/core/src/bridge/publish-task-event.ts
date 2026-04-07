import type { TaskEvent } from "../types.js"
import type { RuntimePublisher } from "./runtime-publisher.js"

export interface PublishTaskEventInput {
  runtimePublisher: RuntimePublisher
  event: TaskEvent
  publishedEventIds: Set<string>
}

export interface PublishTaskEventResult {
  fileWriteCommitted: true
  runtimePublished: boolean
  deduplicated?: boolean
  warning?: string
  correlation_id: string
}

export async function publishTaskEvent(input: PublishTaskEventInput): Promise<PublishTaskEventResult> {
  if (input.publishedEventIds.has(input.event.event_id)) {
    return {
      fileWriteCommitted: true,
      runtimePublished: false,
      deduplicated: true,
      correlation_id: input.event.correlation_id,
    }
  }

  try {
    await input.runtimePublisher.publish(input.event)
    input.publishedEventIds.add(input.event.event_id)

    return {
      fileWriteCommitted: true,
      runtimePublished: true,
      correlation_id: input.event.correlation_id,
    }
  } catch (error) {
    return {
      fileWriteCommitted: true,
      runtimePublished: false,
      warning: String(error),
      correlation_id: input.event.correlation_id,
    }
  }
}
