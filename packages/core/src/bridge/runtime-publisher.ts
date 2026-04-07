import type { TaskEvent } from "../types.js"

export interface RuntimePublisher {
  publish(event: TaskEvent): Promise<void>
}
