import { describe, expect, it } from "vitest"
import { plugin } from "@neon-tiger/plugin"

describe("plugin entry", () => {
  it("returns a hooks object", async () => {
    const hooks = await plugin({} as never)
    expect(hooks).toBeTypeOf("object")
  })
})
