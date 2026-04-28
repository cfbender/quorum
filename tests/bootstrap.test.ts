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
    // moderate trigger categories
    expect(text).toContain("new feature")
    expect(text).toContain("behavior changes")
    expect(text).toContain("architecture")
    // non-trigger categories
    expect(text).toContain("obvious bug fixes")
    expect(text).toContain("Dependency-only bumps")
    // uncertainty fallback
    expect(text).toContain("If you are unsure whether a request is planning")
  })

  it("skips bootstrap in manual mode", () => {
    const config: QuorumConfig = { ...DEFAULT_CONFIG, triggerMode: "manual" }
    expect(renderBootstrap(config)).toBeNull()
  })

  it("skips bootstrap in off mode", () => {
    const config: QuorumConfig = { ...DEFAULT_CONFIG, triggerMode: "off" }
    expect(renderBootstrap(config)).toBeNull()
  })
})
