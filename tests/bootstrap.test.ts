import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "../src/config.js"
import { renderBootstrap } from "../src/bootstrap.js"
import type { QuorumConfig } from "../src/types.js"

const forbiddenCavemanPattern = /\btu\b|\bintu\b|\bfo\b|\bme\s+(?:go|add|write|use)\b/i

describe("bootstrap", () => {
  it("renders the normal-English quorum bootstrap in auto mode", () => {
    const text = renderBootstrap(DEFAULT_CONFIG)
    expect(text).toContain("<quorum-bootstrap>")
    expect(text).toContain("quorum_consult")
    expect(text).toContain("Hard rule")
    expect(text).toContain("Load the `quorum` skill")
    expect(text).not.toMatch(forbiddenCavemanPattern)
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
