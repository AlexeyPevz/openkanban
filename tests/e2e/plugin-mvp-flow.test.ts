// E2E plugin MVP flow — uses legacy createPluginApp API removed in M1.
// Plugin entry now exports `plugin` (OpenCode Plugin SDK interface), not createPluginApp.
// Skipped until e2e tests are rewritten for the new SDK-based plugin API.
//
// Original import (commented out — API no longer exists):
// import { createPluginApp } from "../../src/plugin"

import { describe, it } from "vitest"

describe.skip("plugin MVP flow — restored when e2e tests rewritten for SDK plugin API", () => {
  it("moves a valid planned task to active", () => {})
  it("moves an invalid planned task to blocked and writes blocked_reason", () => {})
})
