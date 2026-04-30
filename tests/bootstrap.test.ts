import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "../src/config.js"
import { renderBootstrap } from "../src/bootstrap.js"
import type { QuorumConfig } from "../src/types.js"

const forbiddenCavemanPattern = /\btu\b|\bintu\b|\bfo\b|\bme\s+(?:go|add|write|use)\b/i

describe("bootstrap", () => {
  it("renders the normal-English quorum bootstrap in auto mode", () => {
    const text = renderBootstrap(DEFAULT_CONFIG)
    expect(text).toContain("<quorum-bootstrap>")
    expect(text).toContain("quorum-sonnet")
    expect(text).toContain("task")
    expect(text).toContain("subagents")
    expect(text).not.toMatch(forbiddenCavemanPattern)
    // mechanical trigger gate
    expect(text).toContain("Trigger gate")
    expect(text).toContain("two or more meaningful design")
    expect(text).toContain("prior art")
    expect(text).toContain("user-facing behavior")
    expect(text).toContain("If any answer is yes")
    // non-trigger examples
    expect(text).toContain("obvious bug fixes")
    expect(text).toContain("dependency-only bumps")
    // uncertainty fallback
    expect(text).toContain("If you are unsure")
  })

  it("contains open-question anti-pattern rule in quorum-bootstrap block", () => {
    const text = renderBootstrap(DEFAULT_CONFIG)!
    // Must be inside <quorum-bootstrap>...</quorum-bootstrap>
    const bootstrapBlock = text.match(/<quorum-bootstrap>([\s\S]*?)<\/quorum-bootstrap>/)?.[0] ?? ""
    expect(bootstrapBlock).toContain("clarification")
    expect(bootstrapBlock).toContain("question tool")
    expect(bootstrapBlock).not.toBe("")
  })

  it("skips bootstrap in manual mode", () => {
    const config: QuorumConfig = { ...DEFAULT_CONFIG, triggerMode: "manual" }
    expect(renderBootstrap(config)).toBeNull()
  })

  it("skips bootstrap in off mode", () => {
    const config: QuorumConfig = { ...DEFAULT_CONFIG, triggerMode: "off" }
    expect(renderBootstrap(config)).toBeNull()
  })

  it("no quorum-deep block in output", () => {
    const text = renderBootstrap(DEFAULT_CONFIG)!
    expect(text).not.toContain("<quorum-deep>")
  })
})
