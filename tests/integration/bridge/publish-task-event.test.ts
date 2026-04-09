import { describe, expect, it } from "vitest"

import { publishTaskEvent, type TaskEvent } from "@openkanban/core"

const event: TaskEvent = {
  event_id: "evt-001",
  correlation_id: "corr-001",
  task_id: "task-001",
  from_status: "planned",
  to_status: "active",
  timestamp: "2026-03-26T00:00:00Z",
  source_file: ".tasks/tasks/task-001.md",
  initiator: "agent",
  preflight_result: "passed",
}

describe("bridge/publish-task-event", () => {
  it("keeps file write successful even when runtime event publish fails", async () => {
    const failingPublisher = {
      publish: async () => {
        throw new Error("publisher unavailable")
      },
    }

    const result = await publishTaskEvent({
      runtimePublisher: failingPublisher,
      event,
      publishedEventIds: new Set<string>(),
    })

    expect(result.fileWriteCommitted).toBe(true)
    expect(result.runtimePublished).toBe(false)
  })

  it("does not publish the same event twice", async () => {
    const calls: string[] = []
    const publisher = {
      publish: async (nextEvent: TaskEvent) => {
        calls.push(nextEvent.event_id)
      },
    }

    const publishedEventIds = new Set<string>()
    await publishTaskEvent({ runtimePublisher: publisher, event, publishedEventIds })
    const second = await publishTaskEvent({ runtimePublisher: publisher, event, publishedEventIds })

    expect(calls).toEqual(["evt-001"])
    expect(second.deduplicated).toBe(true)
  })

  it("keeps correlation id stable between write and publish path", async () => {
    const publisher = {
      publish: async () => {},
    }

    const result = await publishTaskEvent({
      runtimePublisher: publisher,
      event,
      publishedEventIds: new Set<string>(),
    })

    expect(result.correlation_id).toBe(event.correlation_id)
  })
})
