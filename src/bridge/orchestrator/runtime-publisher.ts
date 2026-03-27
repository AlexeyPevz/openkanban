import type { TaskEvent } from "../../core/types.js"

export interface RuntimePublisher {
  publish(event: TaskEvent): Promise<void>
}
